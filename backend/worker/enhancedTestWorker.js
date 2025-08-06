const { Worker } = require('bullmq');
const { exec } = require('child_process');
const path = require('path');
const Docker = require('dockerode');
const TestResult = require('../models/TestResult');

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
        await job.updateProgress(10);
        await job.log('Starting WebDriverIO test execution');
        
        try {
            // CORRECTION : Ajouter APPLICATION_ID pour filtrer les tests
            const command = `${dockerComposeCmd} exec -T -e APK_FILE_NAME=${apkFileName} -e APP_PACKAGE_NAME=${appPackageName || ''} -e APPLICATION_ID=${applicationId} app npx wdio run wdio.conf.js`;
            
            console.log(`[EnhancedTestWorker] Executing command: ${command}`);
            await job.updateProgress(20);
            await job.log(`Executing command: ${command}`);
            
            return new Promise((resolve, reject) => {
                const testProcess = exec(command, {
                    cwd: path.resolve(__dirname, '../../')
                });
                
                let outputBuffer = '';
                let errorBuffer = '';
                
                testProcess.stdout.on('data', async (data) => {
                    const output = data.toString();
                    outputBuffer += output;
                    console.log(`[EnhancedTestWorker][${applicationId}] stdout: ${output}`);
                    await job.log(`stdout: ${output.trim()}`);
                    
                    // Mise à jour de la progression basée sur les vrais patterns WebDriverIO
                    if (output.includes('=== Préparation du test ===')) {
                        await job.updateProgress(30);
                    } else if (output.includes('=== Test prêt ===')) {
                        await job.updateProgress(40);
                    } else if (output.includes('=== Début du test')) {
                        await job.updateProgress(60);
                    } else if (output.includes('✓') && output.includes('trouvé avec:')) {
                        await job.updateProgress(70);
                    } else if (output.includes('Test "') && (output.includes('passed') || output.includes('failed'))) {
                        await job.updateProgress(80);
                    } else if (output.includes('=== Test') && output.includes('réussi ===')) {
                        await job.updateProgress(90);
                    }
                });
                
                testProcess.stderr.on('data', async (data) => {
                    const error = data.toString();
                    errorBuffer += error;
                    console.error(`[EnhancedTestWorker][${applicationId}] stderr: ${error}`);
                    await job.log(`stderr: ${error.trim()}`);
                });
                
                testProcess.on('close', async (code) => {
                    if (code === 0) {
                        console.log(`[EnhancedTestWorker][${applicationId}] Test execution completed successfully.`);
                        await job.updateProgress(100);
                        await job.log('Test execution completed successfully');
                        
                        // Parse and save test results en arrière-plan (non-bloquant)
                        this.parseAndSaveTestResults({
                            output: outputBuffer,
                            stdout: outputBuffer,
                            stderr: errorBuffer
                        }, applicationId, job.id).catch(error => {
                            console.error('[EnhancedTestWorker] Error parsing results (non-blocking):', error);
                        });
                        
                        resolve({ 
                            success: true, 
                            message: 'Tests completed successfully',
                            output: outputBuffer,
                            exitCode: code
                        });
                    } else {
                        const errorMsg = `Test execution failed with exit code ${code}`;
                        console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                        await job.log(errorMsg);
                        if (errorBuffer) {
                            await job.log(`Error details: ${errorBuffer}`);
                        }
                        reject(new Error(`${errorMsg}. Error output: ${errorBuffer}`));
                    }
                });
                
                testProcess.on('error', async (err) => {
                    const errorMsg = `Failed to start test execution: ${err.message}`;
                    console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                    await job.log(errorMsg);
                    reject(err);
                });
            });
            
        } catch (error) {
            await job.log(`Error executing test: ${error.message}`);
            throw error;
        }
    }
    
    async pollTestProgress(job, sessionId) {
        const maxWaitTime = 300000;
        const pollInterval = 5000;
        let elapsed = 0;
        
        while (elapsed < maxWaitTime) {
            try {
                const response = await fetch(`http://mobile-e2e-app-1:3001/test-status/${sessionId}`);
                const data = await response.json();
                
                // Dans la fonction pollTestProgress, ligne ~252
                if (data.status === 'completed') {
                    await job.log('Test execution completed, parsing results...');
                    await parseAndSaveTestResults(data.results, applicationId, job.id); // Ajouter await ici
                    clearInterval(pollInterval);
                    resolve({
                        success: true,
                        message: 'Tests completed successfully',
                        results: data.results
                    });
                } else if (data.status === 'running') {
                    const progress = Math.min(90, 20 + (elapsed / maxWaitTime) * 70);
                    await job.updateProgress(progress);
                    await job.log(`Test in progress... (${Math.round(elapsed/1000)}s)`);
                }
                
            } catch (error) {
                await job.log(`Error polling test status: ${error.message}`);
            }
            
            await this.sleep(pollInterval);
            elapsed += pollInterval;
        }
        
        throw new Error('Test execution timeout');
    }
    
    async parseAndSaveTestResults(testData, applicationId, jobId) {
        try {
            console.log('[EnhancedTestWorker] Starting parseAndSaveTestResults');
            console.log('[EnhancedTestWorker] testData structure:', Object.keys(testData));
            
            // Accéder correctement à la sortie des tests
            const output = testData.output || testData.stdout || '';
            console.log('[EnhancedTestWorker] Test output length:', output.length);
            
            if (!output) {
                console.log('[EnhancedTestWorker] No test output found');
                return;
            }

            // Ligne 351 - Corriger l'appel à extractTestResults
            const testResults = this.extractTestResults(output, applicationId, jobId);
            
            if (testResults.length === 0) {
                console.log('[EnhancedTestWorker] No individual test results found');
                return;
            }

            // Sauvegarder chaque résultat de test
            for (const result of testResults) {
                console.log('[EnhancedTestWorker] Saving test result:', result.testName);
                await TestResult.create(result);
            }

            console.log(`[EnhancedTestWorker] Saved ${testResults.length} test results to database`);
        } catch (error) {
            console.error('[EnhancedTestWorker] Error in parseAndSaveTestResults:', error);
        }
    }
    

 extractTestResults(output, applicationId, jobId) {
    const results = [];
    const lines = output.split('\n');
    
    console.log('[EnhancedTestWorker] Analyzing test output for individual results');
    console.log('[EnhancedTestWorker] Output sample:', output.substring(0, 500));
    
    for (const line of lines) {
        // Pattern principal pour les tests avec retries comme objet
        const testMatch = line.match(/Test \"(.+?)\" (passed|failed) in (\d+)ms \(retries: \[object Object\]\)/);
        if (testMatch) {
            const testResult = {
                application: applicationId,
                jobId: jobId,
                testName: testMatch[1].trim(),
                testFile: 'WebDriverIO Test',
                status: testMatch[2],
                duration: parseInt(testMatch[3]),
                retries: 0, // Défaut car retries est un objet
                error: {
                    message: testMatch[2] === 'failed' ? 'Test failed - see logs for details' : null,
                    stack: null
                }
            };
            results.push(testResult);
            console.log('[EnhancedTestWorker] Found test:', testResult.testName, 'Status:', testResult.status, 'Duration:', testResult.duration);
            continue;
        }
        
        // Pattern alternatif pour les tests avec retries numériques
        const testMatchNumeric = line.match(/Test \"(.+?)\" (passed|failed) in (\d+)ms \(retries: (\d+)\)/);
        if (testMatchNumeric) {
            const testResult = {
                application: applicationId,
                jobId: jobId,
                testName: testMatchNumeric[1].trim(),
                testFile: 'WebDriverIO Test',
                status: testMatchNumeric[2],
                duration: parseInt(testMatchNumeric[3]),
                retries: parseInt(testMatchNumeric[4]),
                error: {
                    message: testMatchNumeric[2] === 'failed' ? 'Test failed - see logs for details' : null,
                    stack: null
                }
            };
            results.push(testResult);
            console.log('[EnhancedTestWorker] Found test (numeric retries):', testResult.testName, 'Status:', testResult.status);
            continue;
        }
        
        // Pattern pour les résumés WebDriverIO avec ✓
        const wdioMatch = line.match(/^\s*✓\s+([a-zA-Z][\w\s-]{5,})\s*$/);
        if (wdioMatch && wdioMatch[1].length > 5) {
            const testResult = {
                application: applicationId,
                jobId: jobId,
                testName: wdioMatch[1].trim(),
                testFile: 'WebDriverIO Test',
                status: 'passed',
                duration: 0,
                retries: 0,
                error: {
                    message: null,
                    stack: null
                }
            };
            results.push(testResult);
            console.log('[EnhancedTestWorker] Found WDIO test:', testResult.testName);
            continue;
        }
    }
    
    // Si aucun test individuel trouvé, analyser les résumés
    if (results.length === 0) {
        console.log('[EnhancedTestWorker] No individual tests found, analyzing summary');
        
        // Chercher des patterns de résumé
        const summaryPassMatch = output.match(/(\d+)\s+passing/);
        const summaryFailMatch = output.match(/(\d+)\s+failing/);
        
        if (summaryPassMatch || summaryFailMatch) {
            const passedCount = summaryPassMatch ? parseInt(summaryPassMatch[1]) : 0;
            const failedCount = summaryFailMatch ? parseInt(summaryFailMatch[1]) : 0;
            
            // Créer des résultats basés sur le résumé
            for (let i = 0; i < passedCount; i++) {
                results.push({
                    application: applicationId,
                    jobId: jobId,
                    testName: `Test Case ${i + 1}`,
                    testFile: 'WebDriverIO Suite',
                    status: 'passed',
                    duration: 0,
                    retries: 0,
                    error: {
                        message: null,
                        stack: null
                    }
                });
            }
            
            for (let i = 0; i < failedCount; i++) {
                results.push({
                    application: applicationId,
                    jobId: jobId,
                    testName: `Failed Test ${i + 1}`,
                    testFile: 'WebDriverIO Suite',
                    status: 'failed',
                    duration: 0,
                    retries: 0,
                    error: {
                        message: 'Test failed - see logs for details',
                        stack: null
                    }
                });
            }
        } else {
            // Fallback
            const hasErrors = output.toLowerCase().includes('error') || 
                            output.toLowerCase().includes('failed') ||
                            output.toLowerCase().includes('✗');
            
            results.push({
                application: applicationId,
                jobId: jobId,
                testName: 'Test Execution Summary',
                testFile: 'WebDriverIO',
                status: hasErrors ? 'failed' : 'passed',
                duration: 0,
                retries: 0,
                error: {
                    message: hasErrors ? 'Errors detected in test output' : null,
                    stack: null
                }
            });
        }
    }
    
    console.log(`[EnhancedTestWorker] Total results extracted: ${results.length}`);
    return results;
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