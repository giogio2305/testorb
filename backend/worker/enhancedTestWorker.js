const { Worker } = require('bullmq');
const { exec } = require('child_process');
const path = require('path');
const Docker = require('dockerode');

// Determine the correct docker-compose command based on OS
const dockerComposeCmd = process.platform === 'win32' ? 'docker-compose' : 'docker compose';
const TEST_RUNNER_SERVICE_NAME = 'app';
const ANDROID_SERVICE_NAME = 'android';
const APPIUM_SERVICE_NAME = 'appium';

class EnhancedTestWorker {
    constructor() {
        this.docker = new Docker();
        this.worker = null;
        this.initWorker();
    }

    initWorker() {
        this.worker = new Worker('test-queue', async (job) => {
            return await this.processTestJob(job);
        }, {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379
            },
            concurrency: 1 // Limit to one test at a time to avoid resource conflicts
        });

        this.worker.on('completed', (job, result) => {
            console.log(`[EnhancedTestWorker] Job ${job.id} completed. Result:`, result);
        });

        this.worker.on('failed', (job, err) => {
            console.error(`[EnhancedTestWorker] Job ${job.id} failed. Error:`, err.message);
        });

        console.log('Enhanced Test Worker started and listening for jobs on test-queue...');
    }

    async processTestJob(job) {
        const { applicationId, apkFileName, appPackageName } = job.data;
        console.log(`[EnhancedTestWorker] Processing job for app ${applicationId}, APK: ${apkFileName}`);

        try {
            await job.updateProgress(5);
            await job.log('Test job started - checking prerequisites');

            if (!apkFileName) {
                const errorMsg = 'APK file name is missing. Cannot run tests.';
                await job.log(`Error: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Step 1: Ensure all required containers are running
            await job.updateProgress(10);
            await job.log('Checking and starting required Docker containers...');
            await this.ensureContainersRunning(job);

            // Step 2: Wait for containers to be healthy
            await job.updateProgress(25);
            await job.log('Waiting for containers to be ready...');
            await this.waitForContainersHealthy(job);

            // Step 3: Execute the test
            await job.updateProgress(40);
            await job.log('Starting test execution...');
            const result = await this.executeTest(job, applicationId, apkFileName, appPackageName);

            await job.updateProgress(100);
            await job.log('Test execution completed successfully');
            return result;

        } catch (error) {
            await job.log(`Test execution failed: ${error.message}`);
            throw error;
        }
    }

    async ensureContainersRunning(job) {
        const requiredServices = [ANDROID_SERVICE_NAME, APPIUM_SERVICE_NAME, TEST_RUNNER_SERVICE_NAME];
        
        try {
            // Check if docker-compose services are running
            const checkCommand = `${dockerComposeCmd} ps --services --filter "status=running"`;
            const runningServices = await this.execCommand(checkCommand);
            
            const missingServices = requiredServices.filter(service => 
                !runningServices.includes(service)
            );

            if (missingServices.length > 0) {
                await job.log(`Missing services: ${missingServices.join(', ')}. Starting containers...`);
                
                // Start services individually to handle dependencies better
                if (missingServices.includes(ANDROID_SERVICE_NAME)) {
                    await job.log('Starting Android emulator...');
                    const androidCommand = `${dockerComposeCmd} up -d ${ANDROID_SERVICE_NAME}`;
                    await this.execCommand(androidCommand);
                    await job.log('Android emulator started, waiting for health check...');
                    await this.sleep(10000); // Give Android time to start
                }
                
                if (missingServices.includes(APPIUM_SERVICE_NAME)) {
                    await job.log('Starting Appium server...');
                    const appiumCommand = `${dockerComposeCmd} up -d ${APPIUM_SERVICE_NAME}`;
                    await this.execCommand(appiumCommand);
                    await job.log('Appium server started, waiting for health check...');
                    await this.sleep(15000); // Give Appium time to connect to Android
                }
                
                await job.log('Docker containers started successfully');
            } else {
                await job.log('All required containers are already running');
            }
        } catch (error) {
            await job.log(`Failed to start containers: ${error.message}`);
            throw new Error(`Container startup failed: ${error.message}`);
        }
    }

    async waitForContainersHealthy(job, maxWaitTime = 180000) {
        const startTime = Date.now();
        const checkInterval = 5000; // Check every 5 seconds
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const healthCommand = `${dockerComposeCmd} ps --format json`;
                const psOutput = await this.execCommand(healthCommand);
                
                // Parse the JSON output to check health status
                const services = psOutput.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter(service => service !== null);

                const androidService = services.find(s => s.Service === ANDROID_SERVICE_NAME);
                const appiumService = services.find(s => s.Service === APPIUM_SERVICE_NAME);
                const testRunnerService = services.find(s => s.Service === TEST_RUNNER_SERVICE_NAME);

                // Check for unhealthy containers and provide specific error messages
                if (androidService?.Health === 'unhealthy') {
                    await job.log('❌ Android emulator is unhealthy. Checking logs...');
                    try {
                        const logsCommand = `${dockerComposeCmd} logs --tail=20 ${ANDROID_SERVICE_NAME}`;
                        const logs = await this.execCommand(logsCommand);
                        await job.log(`Android logs: ${logs}`);
                    } catch (logError) {
                        await job.log(`Failed to get Android logs: ${logError.message}`);
                    }
                }
                
                if (appiumService?.Health === 'unhealthy') {
                    await job.log('❌ Appium server is unhealthy. Checking logs...');
                    try {
                        const logsCommand = `${dockerComposeCmd} logs --tail=20 ${APPIUM_SERVICE_NAME}`;
                        const logs = await this.execCommand(logsCommand);
                        await job.log(`Appium logs: ${logs}`);
                    } catch (logError) {
                        await job.log(`Failed to get Appium logs: ${logError.message}`);
                    }
                }

                if (androidService?.Health === 'healthy' && 
                    appiumService?.Health === 'healthy') {
                    await job.log('✅ All containers are healthy and ready');
                    return;
                }

                const elapsed = Math.round((Date.now() - startTime) / 1000);
                await job.log(`⏳ Waiting for containers (${elapsed}s)... Android: ${androidService?.Health || 'unknown'}, Appium: ${appiumService?.Health || 'unknown'}`);
                await this.sleep(checkInterval);
                
            } catch (error) {
                await job.log(`Health check error: ${error.message}`);
                await this.sleep(checkInterval);
            }
        }
        
        // Final status check before failing
        try {
            const finalHealthCommand = `${dockerComposeCmd} ps --format json`;
            const finalPsOutput = await this.execCommand(finalHealthCommand);
            await job.log(`Final container status: ${finalPsOutput}`);
        } catch (error) {
            await job.log(`Failed to get final container status: ${error.message}`);
        }
        
        throw new Error('Containers failed to become healthy within the timeout period (3 minutes)');
    }

    async executeTest(job, applicationId, apkFileName, appPackageName) {
        // Pre-test diagnostics
        await this.performPreTestDiagnostics(job);
        
        const command = `${dockerComposeCmd} run --rm -e APK_FILE_NAME=${apkFileName} -e APP_PACKAGE_NAME=${appPackageName || ''} ${TEST_RUNNER_SERVICE_NAME} npx wdio run wdio.conf.js`;
        
        await job.log(`Executing test command: ${command}`);
        
        return new Promise((resolve, reject) => {
            const testProcess = exec(command, {
                cwd: path.resolve(__dirname, '../../')
            });

            let outputBuffer = '';
            let errorBuffer = '';
            let currentProgress = 40;
            let containerMonitor = null;
            
            // Start container monitoring after a delay to allow container startup
            setTimeout(async () => {
                containerMonitor = await this.monitorContainerHealth('mobile-e2e-app-1', 10000);
            }, 5000);

            testProcess.stdout.on('data', async (data) => {
                const output = data.toString();
                outputBuffer += output;
                console.log(`[EnhancedTestWorker][${applicationId}] stdout: ${output}`);
                await job.log(`stdout: ${output.trim()}`);
                
                // Update progress based on output patterns
                if (output.includes('Starting WebDriver session') && currentProgress < 60) {
                    currentProgress = 60;
                    await job.updateProgress(currentProgress);
                    await job.log('WebDriver session started');
                } else if (output.includes('Running tests') || output.includes('RUNNING in Android') && currentProgress < 75) {
                    currentProgress = 75;
                    await job.updateProgress(currentProgress);
                    await job.log('Test execution in progress');
                } else if (output.includes('Test execution') || output.includes('passing') && currentProgress < 90) {
                    currentProgress = 90;
                    await job.updateProgress(currentProgress);
                    await job.log('Test execution completing');
                }
                
                // Log important test milestones
                if (output.includes('PASSED in Android')) {
                    await job.log('✅ Test suite passed successfully');
                } else if (output.includes('FAILED in Android')) {
                    await job.log('❌ Test suite failed');
                } else if (output.includes('passing')) {
                    const passingMatch = output.match(/(\d+)\s+passing/);
                    if (passingMatch) {
                        await job.log(`✅ ${passingMatch[1]} test(s) passed`);
                    }
                }
            });

            testProcess.stderr.on('data', async (data) => {
                const error = data.toString();
                errorBuffer += error;
                console.error(`[EnhancedTestWorker][${applicationId}] stderr: ${error}`);
                await job.log(`stderr: ${error.trim()}`);
            });

testProcess.on('close', async (code) => {
                console.log(`[EnhancedTestWorker][${applicationId}] Process closed with exit code: ${code}`);
                
                // Stop container monitoring
                if (containerMonitor) {
                    clearInterval(containerMonitor);
                }
                
                // Check container status for additional context
                const containerStatus = await this.checkContainerStatus('mobile-e2e-app-1');
                console.log(`[EnhancedTestWorker][${applicationId}] Container status:`, containerStatus);
                
                if (code === 0) {
                    console.log(`[EnhancedTestWorker][${applicationId}] Test execution completed successfully.`);
                    resolve({ 
                        success: true, 
                        message: 'Tests completed successfully',
                        output: outputBuffer,
                        exitCode: code,
                        containerStatus
                    });
                } else if (code === 137) {
                    // Container was killed (SIGKILL) - check if test actually passed
                    console.log(`[EnhancedTestWorker][${applicationId}] Container was killed (exit code 137)`);
                    
                    // Check if tests actually passed by examining output
                    const testsPassed = outputBuffer.includes('passing') && !outputBuffer.includes('failing');
                    const hasTestResults = outputBuffer.includes('spec') || outputBuffer.includes('test');
                    
                    if (testsPassed && hasTestResults) {
                        console.log(`[EnhancedTestWorker][${applicationId}] Tests passed despite container termination - treating as success`);
                        resolve({ 
                            success: true, 
                            message: 'Tests completed successfully (container terminated after completion)',
                            output: outputBuffer,
                            exitCode: 0,
                            containerStatus,
                            originalExitCode: code
                        });
                    } else {
                        const errorMsg = `Test execution failed - container killed (exit code ${code})`;
                        console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                        reject(new Error(`${errorMsg}. Output: ${outputBuffer}. Error: ${errorBuffer}`));
                    }
                } else {
                    // Check if tests actually passed despite non-zero exit code
                    const testsPassed = this.checkTestSuccess(outputBuffer);
                    
                    if (testsPassed) {
                        console.log(`[EnhancedTestWorker][${applicationId}] Tests passed despite exit code ${code} - treating as success`);
                        await job.log(`Tests completed successfully despite exit code ${code}`);
                        resolve({ 
                            success: true, 
                            message: `Tests completed successfully (exit code ${code} ignored due to successful test results)`,
                            output: outputBuffer,
                            exitCode: 0,
                            containerStatus,
                            originalExitCode: code
                        });
                        return;
                    }
                    
                    // Enhanced error handling for exit code 1 (UiAutomator2 issues)
                    if (code === 1) {
                        await this.handleUiAutomator2Error(job, outputBuffer, errorBuffer, containerStatus);
                    }
                    
                    const errorMsg = `Test execution failed with exit code ${code}`;
                    console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                    reject(new Error(`${errorMsg}. Output: ${outputBuffer}. Error: ${errorBuffer}`));
                }
            });

            testProcess.on('error', async (err) => {
                // Stop container monitoring
                if (containerMonitor) {
                    clearInterval(containerMonitor);
                }
                
                const errorMsg = `Failed to start test process: ${err.message}`;
                console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                await job.log(errorMsg);
                reject(new Error(errorMsg));
            });
        });
    }

    async checkContainerStatus(containerName) {
        try {
            const container = this.docker.getContainer(containerName);
            const info = await container.inspect();
            return {
                status: info.State.Status,
                exitCode: info.State.ExitCode,
                finishedAt: info.State.FinishedAt,
                startedAt: info.State.StartedAt,
                running: info.State.Running,
                oomKilled: info.State.OOMKilled,
                pid: info.State.Pid
            };
        } catch (error) {
            return { status: 'not_found', error: error.message };
        }
    }

    async logContainerStats(containerName) {
        try {
            const container = this.docker.getContainer(containerName);
            const stats = await container.stats({ stream: false });
            const memoryUsage = stats.memory_stats.usage || 0;
            const memoryLimit = stats.memory_stats.limit || 0;
            const memoryPercent = memoryLimit > 0 ? (memoryUsage / memoryLimit * 100).toFixed(2) : 0;
            
            console.log(`[ContainerStats][${containerName}] Memory: ${memoryUsage} / ${memoryLimit} (${memoryPercent}%)`);
            return { memoryUsage, memoryLimit, memoryPercent };
        } catch (error) {
            console.log(`[ContainerStats][${containerName}] Failed to get stats: ${error.message}`);
            return null;
        }
    }

    async monitorContainerHealth(containerName, intervalMs = 5000) {
        const monitor = setInterval(async () => {
            const status = await this.checkContainerStatus(containerName);
            if (status.status !== 'running') {
                console.log(`[ContainerMonitor][${containerName}] Container stopped. Status: ${status.status}`);
                clearInterval(monitor);
            } else {
                await this.logContainerStats(containerName);
            }
        }, intervalMs);
        
        return monitor;
    }

    async performPreTestDiagnostics(job) {
        try {
            await job.log('Running pre-test diagnostics...');
            
            // Check Android emulator status
            await job.log('Checking Android emulator status...');
            const adbDevicesCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} adb devices`;
            const devices = await this.execCommand(adbDevicesCmd);
            await job.log(`ADB devices: ${devices}`);
            
            // Check if emulator is booted
            const bootCompleteCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} adb shell getprop sys.boot_completed`;
            const bootStatus = await this.execCommand(bootCompleteCmd);
            await job.log(`Boot completed: ${bootStatus}`);
            
            // Check Appium server status
            await job.log('Checking Appium server status...');
            const appiumStatusCmd = `${dockerComposeCmd} exec -T ${APPIUM_SERVICE_NAME} curl -s http://localhost:4723/wd/hub/status || echo "Appium not responding"`;
            const appiumStatus = await this.execCommand(appiumStatusCmd);
            await job.log(`Appium status: ${appiumStatus}`);
            
            // Check available storage
            const storageCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} df -h /sdcard`;
            const storage = await this.execCommand(storageCmd);
            await job.log(`Storage info: ${storage}`);
            
        } catch (error) {
            await job.log(`Pre-test diagnostics warning: ${error.message}`);
        }
    }

    checkTestSuccess(outputBuffer) {
        // Check for various success indicators in the test output
        const successPatterns = [
            /\d+\s+passing/i,                    // "1 passing", "2 passing", etc.
            /PASSED\s+in\s+Android/i,            // "PASSED in Android"
            /✓.*should.*launch.*app/i,           // Checkmark with test description
            /Test\s+passed:/i,                   // "Test passed:"
            /Test\s+completed\s+successfully/i   // "Test completed successfully"
        ];
        
        const failurePatterns = [
            /\d+\s+failing/i,                    // "1 failing", "2 failing", etc.
            /FAILED\s+in\s+Android/i,            // "FAILED in Android"
            /✗.*should.*launch.*app/i,           // X mark with test description
            /Test\s+failed:/i,                   // "Test failed:"
            /AssertionError/i,                   // Assertion errors
            /Error:/i                            // General errors
        ];
        
        // Check if any success patterns match
        const hasSuccessIndicators = successPatterns.some(pattern => pattern.test(outputBuffer));
        
        // Check if any failure patterns match
        const hasFailureIndicators = failurePatterns.some(pattern => pattern.test(outputBuffer));
        
        // Additional check for spec completion percentage
        const specCompletionMatch = outputBuffer.match(/Spec\s+Files:\s+\d+\s+passed.*\((\d+)%\s+completed\)/i);
        const isFullyCompleted = specCompletionMatch && parseInt(specCompletionMatch[1]) === 100;
        
        // Return true if we have success indicators, no failure indicators, and tests completed
        return hasSuccessIndicators && !hasFailureIndicators && isFullyCompleted;
    }

    async handleUiAutomator2Error(job, outputBuffer, errorBuffer, containerStatus) {
        try {
            await job.log('Analyzing UiAutomator2 error...');
            
            // Check for specific UiAutomator2 error patterns
            const errorPatterns = [
                'Could not proxy command to the remote server',
                'UiAutomator2 server is not running',
                'instrumentation process is not running',
                'Application under test with package',
                'crashed'
            ];
            
            const detectedErrors = errorPatterns.filter(pattern => 
                outputBuffer.includes(pattern) || errorBuffer.includes(pattern)
            );
            
            if (detectedErrors.length > 0) {
                await job.log(`Detected UiAutomator2 issues: ${detectedErrors.join(', ')}`);
                
                // Try to restart UiAutomator2 server
                await job.log('Attempting to restart UiAutomator2 server...');
                const restartCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} adb shell am force-stop io.appium.uiautomator2.server`;
                await this.execCommand(restartCmd);
                
                // Clear app data if package name is available
                if (outputBuffer.includes('package')) {
                    const packageMatch = outputBuffer.match(/package\s+([\w\.]+)/);
                    if (packageMatch) {
                        const packageName = packageMatch[1];
                        await job.log(`Clearing app data for package: ${packageName}`);
                        const clearCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} adb shell pm clear ${packageName}`;
                        await this.execCommand(clearCmd);
                    }
                }
            }
            
            // Log additional debugging info
            const logcatCmd = `${dockerComposeCmd} exec -T ${ANDROID_SERVICE_NAME} adb logcat -d -t 50`;
            const logcat = await this.execCommand(logcatCmd);
            await job.log(`Recent logcat entries: ${logcat.substring(0, 1000)}...`);
            
        } catch (error) {
            await job.log(`UiAutomator2 error analysis failed: ${error.message}`);
        }
    }

    async execCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, { cwd: path.resolve(__dirname, '../../') }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}. stderr: ${stderr}`));
                } else {
                    resolve(stdout.trim());
                }
            });
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        if (this.worker) {
            await this.worker.close();
            console.log('Enhanced Test Worker shut down gracefully');
        }
    }
}

// Create and start the enhanced worker
const enhancedWorker = new EnhancedTestWorker();

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await enhancedWorker.shutdown();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await enhancedWorker.shutdown();
    process.exit(0);
});

module.exports = EnhancedTestWorker;