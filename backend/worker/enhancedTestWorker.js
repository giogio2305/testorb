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
        this.worker = new Worker(
            'test-queue',
            async (job) => {
                // Gérer les deux types de jobs
                if (job.name === 'run-single-test') {
                    return await this.processSingleTestJob(job);
                } else {
                    return await this.processTestJob(job);
                }
            },
            {
                connection: {
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                },
                concurrency: 1,
            }
        );

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
        console.log(
            `[EnhancedTestWorker] Processing job for app ${applicationId}, APK: ${apkFileName}`
        );

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
        const requiredServices = [
            ANDROID_SERVICE_NAME,
            APPIUM_SERVICE_NAME,
            TEST_RUNNER_SERVICE_NAME,
        ];

        try {
            // Check if docker-compose services are running
            const checkCommand = `${dockerComposeCmd} ps --services --filter "status=running"`;
            const runningServices = await this.execCommand(checkCommand);

            const missingServices = requiredServices.filter(
                (service) => !runningServices.includes(service)
            );

            if (missingServices.length > 0) {
                await job.log(
                    `Missing services: ${missingServices.join(', ')}. Starting containers...`
                );

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
                const services = psOutput
                    .split('\n')
                    .filter((line) => line.trim())
                    .map((line) => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter((service) => service !== null);

                const androidService = services.find((s) => s.Service === ANDROID_SERVICE_NAME);
                const appiumService = services.find((s) => s.Service === APPIUM_SERVICE_NAME);
                const testRunnerService = services.find(
                    (s) => s.Service === TEST_RUNNER_SERVICE_NAME
                );

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

                if (androidService?.Health === 'healthy' && appiumService?.Health === 'healthy') {
                    await job.log('✅ All containers are healthy and ready');
                    return;
                }

                const elapsed = Math.round((Date.now() - startTime) / 1000);
                await job.log(
                    `⏳ Waiting for containers (${elapsed}s)... Android: ${
                        androidService?.Health || 'unknown'
                    }, Appium: ${appiumService?.Health || 'unknown'}`
                );
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

        throw new Error(
            'Containers failed to become healthy within the timeout period (3 minutes)'
        );
    }

    // Ajouter cette méthode AVANT la fermeture de la classe
    async processSingleTestJob(job) {
        const { applicationId, apkFileName, appPackageName, testFile, testName } = job.data;
        console.log(
            `[EnhancedTestWorker] Processing single test job for app ${applicationId}, test: ${testName}`
        );

        try {
            await job.updateProgress(5);
            await job.log(`Single test job started - ${testName}`);

            if (!apkFileName) {
                const errorMsg = 'APK file name is missing. Cannot run test.';
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

            // Step 3: Execute the single test
            await job.updateProgress(40);
            await job.log(`Starting execution of test: ${testName}`);
            const result = await this.executeSingleTest(
                job,
                applicationId,
                apkFileName,
                appPackageName,
                testFile
            );

            await job.updateProgress(100);
            await job.log('Single test execution completed successfully');
            return result;
        } catch (error) {
            await job.log(`Single test execution failed: ${error.message}`);
            throw error;
        }
    }

    // Ajouter cette méthode AVANT la fermeture de la classe
    async executeSingleTest(job, applicationId, apkFileName, appPackageName, testFile) {
        await job.updateProgress(10);
        await job.log('Starting WebDriverIO single test execution');

        try {
            const command = `${dockerComposeCmd} exec -T -e APK_FILE_NAME=${apkFileName} -e APP_PACKAGE_NAME=${
                appPackageName || ''
            } app npx wdio run wdio.conf.js --spec ./specs/${applicationId}/${testFile}`;

            console.log(`[EnhancedTestWorker] Executing single test command: ${command}`);
            await job.updateProgress(20);
            await job.log(`Executing single test: ${command}`);

            return new Promise((resolve, reject) => {
                const testProcess = exec(command, {
                    cwd: path.resolve(__dirname, '../../'),
                });

                let outputBuffer = '';
                let errorBuffer = '';

                testProcess.stdout.on('data', async (data) => {
                    const output = data.toString();
                    outputBuffer += output;
                    console.log(`[EnhancedTestWorker][${applicationId}] stdout: ${output}`);
                    await job.log(`stdout: ${output.trim()}`);

                    // Mise à jour de la progression pour un seul test
                    if (output.includes('=== Préparation du test ===')) {
                        await job.updateProgress(30);
                    } else if (output.includes('=== Test prêt ===')) {
                        await job.updateProgress(50);
                    } else if (output.includes('=== Début du test')) {
                        await job.updateProgress(70);
                    } else if (output.includes('✓') && output.includes('trouvé avec:')) {
                        await job.updateProgress(85);
                    } else if (output.includes('=== Test') && output.includes('réussi ===')) {
                        await job.updateProgress(95);
                    }
                });

                testProcess.stderr.on('data', async (data) => {
                    const error = data.toString();
                    errorBuffer += error;
                    console.error(`[EnhancedTestWorker][${applicationId}] stderr: ${error}`);
                    await job.log(`stderr: ${error.trim()}`);
                });

                testProcess.on('close', async (code) => {
                    // Parse and save test results regardless of exit code
                    console.log(`[EnhancedTestWorker][${applicationId}] Test execution finished with exit code ${code}`);
                    console.log(`[EnhancedTestWorker][${applicationId}] Parsing and saving test results...`);
                    
                    try {
                        await this.parseAndSaveTestResults(
                            {
                                output: outputBuffer,
                                stdout: outputBuffer,
                                stderr: errorBuffer,
                            },
                            applicationId,
                            job.id,
                            true // isSingleTest = true pour un test unique
                        );
                        console.log(`[EnhancedTestWorker][${applicationId}] Test results parsing completed`);
                    } catch (error) {
                        console.error(
                            '[EnhancedTestWorker] Error parsing single test results:',
                            error
                        );
                    }

                    if (code === 0) {
                        console.log(
                            `[EnhancedTestWorker][${applicationId}] Single test execution completed successfully.`
                        );
                        await job.updateProgress(100);
                        await job.log('Single test execution completed successfully');

                        resolve({
                            success: true,
                            message: 'Single test completed successfully',
                            output: outputBuffer,
                            exitCode: code,
                        });
                    } else {
                        const errorMsg = `Single test execution failed with exit code ${code}`;
                        console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                        await job.log(errorMsg);
                        if (errorBuffer) {
                            await job.log(`Error details: ${errorBuffer}`);
                        }
                        reject(new Error(`${errorMsg}. Error output: ${errorBuffer}`));
                    }
                });

                testProcess.on('error', async (err) => {
                    const errorMsg = `Failed to start single test execution: ${err.message}`;
                    console.error(`[EnhancedTestWorker][${applicationId}] ${errorMsg}`);
                    await job.log(errorMsg);
                    reject(err);
                });
            });
        } catch (error) {
            await job.log(`Error executing single test: ${error.message}`);
            throw error;
        }
    }

    async executeTest(job, applicationId, apkFileName, appPackageName) {
        await job.updateProgress(10);
        await job.log('Starting WebDriverIO test execution');

        try {
            // CORRECTION : Ajouter APPLICATION_ID pour filtrer les tests
            const command = `${dockerComposeCmd} exec -T -e APK_FILE_NAME=${apkFileName} -e APP_PACKAGE_NAME=${
                appPackageName || ''
            } -e APPLICATION_ID=${applicationId} app npx wdio run wdio.conf.js`;

            console.log(`[EnhancedTestWorker] Executing command: ${command}`);
            await job.updateProgress(20);
            await job.log(`Executing command: ${command}`);

            return new Promise((resolve, reject) => {
                const testProcess = exec(command, {
                    cwd: path.resolve(__dirname, '../../'),
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
                    } else if (
                        output.includes('Test "') &&
                        (output.includes('passed') || output.includes('failed'))
                    ) {
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
                    // Parse and save test results TOUJOURS, même en cas d'échec
                    // Ceci permet de capturer les échecs d'assertions qui sont des résultats valides
                    console.log(`[EnhancedTestWorker][${applicationId}] Parsing test results (exit code: ${code})`);
                    this.parseAndSaveTestResults(
                        {
                            output: outputBuffer,
                            stdout: outputBuffer,
                            stderr: errorBuffer,
                        },
                        applicationId,
                        job.id
                    ).catch((error) => {
                        console.error(
                            '[EnhancedTestWorker] Error parsing results (non-blocking):',
                            error
                        );
                    });

                    if (code === 0) {
                        console.log(
                            `[EnhancedTestWorker][${applicationId}] Test execution completed successfully.`
                        );
                        await job.updateProgress(100);
                        await job.log('Test execution completed successfully');

                        resolve({
                            success: true,
                            message: 'Tests completed successfully',
                            output: outputBuffer,
                            exitCode: code,
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
                const response = await fetch(
                    `http://mobile-e2e-app-1:3001/test-status/${sessionId}`
                );
                const data = await response.json();

                // Dans la fonction pollTestProgress, ligne ~252
                if (data.status === 'completed') {
                    await job.log('Test execution completed, parsing results...');
                    await parseAndSaveTestResults(data.results, applicationId, job.id); // Ajouter await ici
                    clearInterval(pollInterval);
                    resolve({
                        success: true,
                        message: 'Tests completed successfully',
                        results: data.results,
                    });
                } else if (data.status === 'running') {
                    const progress = Math.min(90, 20 + (elapsed / maxWaitTime) * 70);
                    await job.updateProgress(progress);
                    await job.log(`Test in progress... (${Math.round(elapsed / 1000)}s)`);
                }
            } catch (error) {
                await job.log(`Error polling test status: ${error.message}`);
            }

            await this.sleep(pollInterval);
            elapsed += pollInterval;
        }

        throw new Error('Test execution timeout');
    }

    async parseAndSaveTestResults(testData, applicationId, jobId, isSingleTest = false) {
        try {
            console.log('[EnhancedTestWorker] Starting parseAndSaveTestResults');
            console.log('[EnhancedTestWorker] testData structure:', Object.keys(testData));
            console.log('[EnhancedTestWorker] applicationId:', applicationId, 'jobId:', jobId, 'isSingleTest:', isSingleTest);

            // Accéder correctement à la sortie des tests
            const output = testData.output || testData.stdout || '';
            console.log('[EnhancedTestWorker] Test output length:', output.length);
            
            // Log d'un échantillon de la sortie pour diagnostic
            if (output.length > 0) {
                const sample = output.substring(0, 500);
                console.log('[EnhancedTestWorker] Output sample:', sample);
            }

            if (!output) {
                console.log('[EnhancedTestWorker] No test output found - ABORTING');
                return;
            }

            // Ligne 351 - Corriger l'appel à extractTestResults
            console.log('[EnhancedTestWorker] Calling extractTestResults...');
            const testResults = this.extractTestResults(output, applicationId, jobId, isSingleTest);
            console.log('[EnhancedTestWorker] extractTestResults returned:', testResults.length, 'results');

            if (testResults.length === 0) {
                console.log('[EnhancedTestWorker] No individual test results found - ABORTING');
                // Log plus de détails pour diagnostic
                console.log('[EnhancedTestWorker] Full output for analysis:');
                console.log(output);
                return;
            }

            // Pour un test unique, ne sauvegarder que le premier résultat
            const resultsToSave = isSingleTest ? [testResults[0]] : testResults;
            console.log(`[EnhancedTestWorker] Will save ${resultsToSave.length} results (isSingleTest: ${isSingleTest})`);

            // Sauvegarder chaque résultat de test
            let savedCount = 0;
            for (const result of resultsToSave) {
                try {
                    console.log('[EnhancedTestWorker] Attempting to save test result:', result.testName, 'status:', result.status);
                    
                    // Vérifier si applicationId est un ObjectId valide
                    const mongoose = require('mongoose');
                    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
                        console.log('[EnhancedTestWorker] Invalid applicationId, creating a temporary ObjectId for testing');
                        result.application = new mongoose.Types.ObjectId();
                    }
                    
                    await TestResult.create(result);
                    savedCount++;
                    console.log('[EnhancedTestWorker] Successfully saved test result:', result.testName);
                } catch (saveError) {
                    console.error('[EnhancedTestWorker] Failed to save individual test result:', result.testName, 'Error:', saveError.message);
                    console.error('[EnhancedTestWorker] Result data:', JSON.stringify(result, null, 2));
                }
            }

            console.log(
                `[EnhancedTestWorker] FINAL RESULT: Saved ${savedCount}/${resultsToSave.length} test results to database`
            );
        } catch (error) {
            console.error('[EnhancedTestWorker] Error in parseAndSaveTestResults:', error);
            console.error('[EnhancedTestWorker] Stack trace:', error.stack);
        }
    }

    extractTestResults(output, applicationId, jobId, isSingleTest = false) {
        const results = [];
        const lines = output.split('\n');
        const elementFailures = new Set(); // Pour éviter les doublons d'échecs d'éléments

        console.log('[EnhancedTestWorker] Analyzing test output for individual results, isSingleTest:', isSingleTest);
        console.log('[EnhancedTestWorker] Total lines to analyze:', lines.length);
        console.log('[EnhancedTestWorker] Looking for patterns in output...');
        console.log('[EnhancedTestWorker] Output sample:', output.substring(0, 500));

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Log des lignes suspectes pour diagnostic
            if (line.includes('failed') || line.includes('Failed') || line.includes('expect') || line.includes('Error')) {
                console.log(`[EnhancedTestWorker] Line ${i+1} contains failure keywords:`, line.trim());
            }
            
            // Pattern principal pour les tests avec retries comme objet
            const testMatch = line.match(
                /Test \"(.+?)\" (passed|failed) in (\d+)ms \(retries: \[object Object\]\)/
            );
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
                        message:
                            testMatch[2] === 'failed' ? 'Test failed - see logs for details' : null,
                        stack: null,
                    },
                };
                results.push(testResult);
                console.log(
                    '[EnhancedTestWorker] Found test:',
                    testResult.testName,
                    'Status:',
                    testResult.status,
                    'Duration:',
                    testResult.duration
                );
                
                // Pour un test unique, retourner immédiatement après le premier résultat
                if (isSingleTest) {
                    console.log('[EnhancedTestWorker] Single test mode - returning first result');
                    return results;
                }
                continue;
            }

            // Pattern alternatif pour les tests avec retries numériques
            const testMatchNumeric = line.match(
                /Test \"(.+?)\" (passed|failed) in (\d+)ms \(retries: (\d+)\)/
            );
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
                        message:
                            testMatchNumeric[2] === 'failed'
                                ? 'Test failed - see logs for details'
                                : null,
                        stack: null,
                    },
                };
                results.push(testResult);
                console.log(
                    '[EnhancedTestWorker] Found test (numeric retries):',
                    testResult.testName,
                    'Status:',
                    testResult.status
                );
                
                // Pour un test unique, retourner immédiatement après le premier résultat
                if (isSingleTest) {
                    console.log('[EnhancedTestWorker] Single test mode - returning first result');
                    return results;
                }
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
                        stack: null,
                    },
                };
                results.push(testResult);
                console.log('[EnhancedTestWorker] Found WDIO test:', testResult.testName);
                continue;
            }

            // Pattern pour les échecs d'assertions WebDriverIO avec Expected/Received
            const expectedReceivedMatch = line.match(/\[0-0\]\s+Expected:\s*(.+)/);
            if (expectedReceivedMatch && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const receivedMatch = nextLine.match(/\[0-0\]\s+Received:\s*(.+)/);
                if (receivedMatch) {
                    console.log('[EnhancedTestWorker] PATTERN MATCH: WebDriverIO Expected/Received assertion failure detected');
                    
                    // Chercher le nom du test dans les lignes précédentes
                    let testName = 'Unknown Test';
                    const runningMatch = output.match(/\[0-0\]\s+RUNNING\s+in\s+.+?\s+-\s+(.+?\.js)/);
                    if (runningMatch) {
                        const testFilePath = runningMatch[1];
                        testName = testFilePath.split('/').pop().replace(/\d+-/, '').replace('.js', '');
                        console.log('[EnhancedTestWorker] Extracted test name from RUNNING pattern:', testName);
                    }
                    
                    const expected = expectedReceivedMatch[1].trim();
                    const received = receivedMatch[1].trim();
                    
                    const testResult = {
                        application: applicationId,
                        jobId: jobId,
                        testName: testName,
                        testFile: 'WebDriverIO Test',
                        status: 'failed',
                        duration: 0,
                        retries: 0,
                        error: {
                            message: `Assertion failed - Expected: ${expected}, Received: ${received}`,
                            stack: null,
                        },
                    };
                    results.push(testResult);
                    console.log('[EnhancedTestWorker] Added Expected/Received assertion failure:', testResult.testName);
                    i++; // Skip the next line since we processed it
                    continue;
                }
            }

            // Pattern pour les échecs d'assertions WebDriverIO génériques
            const assertionFailMatch = line.match(/\[0-0\]\s+Test "(.+?)" failed:\s*(.+)/);
            if (assertionFailMatch) {
                console.log('[EnhancedTestWorker] PATTERN MATCH: WebDriverIO assertion failure detected');
                const testResult = {
                    application: applicationId,
                    jobId: jobId,
                    testName: assertionFailMatch[1].trim(),
                    testFile: 'WebDriverIO Test',
                    status: 'failed',
                    duration: 0,
                    retries: 0,
                    error: {
                        message: assertionFailMatch[2].trim(),
                        stack: null,
                    },
                };
                results.push(testResult);
                console.log('[EnhancedTestWorker] Added failed test result:', testResult.testName);
                continue;
            }

            // Pattern pour détecter les échecs de tests basés sur des éléments non trouvés
            const elementNotFoundMatch = line.match(/\[0-0\]\s+✗\s+Selector\s+(.+?)\s+failed\s+for\s+'(.+?)':\s*(.+)/);
            if (elementNotFoundMatch) {
                console.log('[EnhancedTestWorker] PATTERN MATCH: Element not found failure detected');
                // Chercher le nom du test dans toute la sortie (pas seulement les lignes précédentes)
                let testName = 'Unknown Test';
                
                // D'abord chercher le pattern RUNNING pour obtenir le nom du fichier
                const runningMatch = output.match(/\[0-0\]\s+RUNNING\s+in\s+.+?\s+-\s+(.+?\.js)/);
                if (runningMatch) {
                    const testFilePath = runningMatch[1];
                    testName = testFilePath.split('/').pop().replace(/\d+-/, '').replace('.js', '');
                    console.log('[EnhancedTestWorker] Extracted test name from RUNNING pattern:', testName);
                } else {
                    // Fallback: chercher dans les lignes précédentes
                    for (let j = Math.max(0, i - 20); j < i; j++) {
                        const prevLine = lines[j];
                        const testNameMatch = prevLine.match(/\[0-0\]\s+(.+?)\s+test\s+started|\[0-0\]\s+Running\s+test:\s+(.+)|\[0-0\]\s+RUNNING\s+in\s+.+?\s+-\s+(.+?)\s*$/);
                        if (testNameMatch) {
                            testName = (testNameMatch[1] || testNameMatch[2] || testNameMatch[3] || '').trim();
                            if (testName.includes('/')) {
                                // Extraire le nom du fichier de test
                                const parts = testName.split('/');
                                testName = parts[parts.length - 1].replace('.js', '').replace(/\d+-/, '');
                            }
                            break;
                        }
                    }
                }
                
                // Créer une clé unique pour éviter les doublons
                const failureKey = `${testName}_element_failure`;
                if (!elementFailures.has(failureKey)) {
                    elementFailures.add(failureKey);
                    
                    const testResult = {
                        application: applicationId,
                        jobId: jobId,
                        testName: testName,
                        testFile: 'WebDriverIO Test',
                        status: 'failed',
                        duration: 0,
                        retries: 0,
                        error: {
                            message: `Test failed due to element not found errors - multiple selectors failed`,
                            stack: null,
                        },
                    };
                    results.push(testResult);
                    console.log('[EnhancedTestWorker] Found element not found failure for test:', testResult.testName);
                }
                continue;
            }

            // Pattern pour détecter les erreurs d'égalité expect().toBe()
            const expectErrorMatch = line.match(/expect\(received\)\.toBe\(expected\)/);
            if (expectErrorMatch && results.length > 0) {
                // Enrichir le dernier test trouvé avec plus de détails sur l'erreur
                const lastResult = results[results.length - 1];
                if (lastResult.status === 'failed' && lastResult.error.message) {
                    lastResult.error.message += ' - Assertion failure: expect().toBe() equality check failed';
                }
                continue;
            }

            // Pattern général pour les échecs d'assertions avec détails
            const generalAssertionMatch = line.match(/^\s*(.+?)\s+(FAILED|failed)\s*$/);
            if (generalAssertionMatch && line.includes('expect')) {
                const testResult = {
                    application: applicationId,
                    jobId: jobId,
                    testName: generalAssertionMatch[1].trim(),
                    testFile: 'WebDriverIO Test',
                    status: 'failed',
                    duration: 0,
                    retries: 0,
                    error: {
                        message: 'Assertion failed - see test output for details',
                        stack: null,
                    },
                };
                results.push(testResult);
                console.log('[EnhancedTestWorker] Found general assertion failure:', testResult.testName);
                continue;
            }

            // Pattern pour capturer les messages d'erreur détaillés (Received/Expected)
            const receivedExpectedMatch = line.match(/Received:\s*(.+)/);
            if (receivedExpectedMatch && results.length > 0) {
                const lastResult = results[results.length - 1];
                if (lastResult.status === 'failed') {
                    if (!lastResult.error.message.includes('Received:')) {
                        lastResult.error.message += ` | Received: ${receivedExpectedMatch[1].trim()}`;
                    }
                }
                continue;
            }

            const expectedMatch = line.match(/Expected:\s*(.+)/);
            if (expectedMatch && results.length > 0) {
                const lastResult = results[results.length - 1];
                if (lastResult.status === 'failed') {
                    if (!lastResult.error.message.includes('Expected:')) {
                        lastResult.error.message += ` | Expected: ${expectedMatch[1].trim()}`;
                    }
                }
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
                            stack: null,
                        },
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
                            stack: null,
                        },
                    });
                }
            } else {
                // Fallback
                const hasErrors =
                    output.toLowerCase().includes('error') ||
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
                        stack: null,
                    },
                });
            }
        }

        // Si aucun résultat de test n'a été trouvé mais qu'il y a des échecs d'éléments,
        // créer un résultat de test générique basé sur le fichier de test
        if (results.length === 0) {
            console.log('[EnhancedTestWorker] No standard test results found, looking for test file patterns...');
            
            // Chercher le pattern de fichier de test en cours d'exécution
            const runningTestMatch = output.match(/\[0-0\]\s+RUNNING\s+in\s+.+?\s+-\s+(.+?\.js)/);
            if (runningTestMatch) {
                const testFilePath = runningTestMatch[1];
                const testFileName = testFilePath.split('/').pop().replace(/\d+-/, '').replace('.js', '');
                
                // Vérifier s'il y a des échecs d'éléments dans la sortie
                const hasElementFailures = output.includes('✗ Selector') && output.includes('failed for');
                
                if (hasElementFailures) {
                    console.log('[EnhancedTestWorker] Creating generic test result for file with element failures:', testFileName);
                    const testResult = {
                        application: applicationId,
                        jobId: jobId,
                        testName: testFileName,
                        testFile: 'WebDriverIO Test',
                        status: 'failed',
                        duration: 0,
                        retries: 0,
                        error: {
                            message: 'Test failed due to element not found errors - see logs for details',
                            stack: null,
                        },
                    };
                    results.push(testResult);
                    console.log('[EnhancedTestWorker] Added generic test failure result:', testResult.testName);
                }
            }
        }

        console.log(`[EnhancedTestWorker] Total results extracted: ${results.length}`);
        
        // Si isSingleTest est true, retourner seulement le premier résultat
        if (isSingleTest && results.length > 0) {
            console.log(`[EnhancedTestWorker] isSingleTest=true, returning only first result`);
            return [results[0]];
        }
        
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
                pid: info.State.Pid,
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
            const memoryPercent =
                memoryLimit > 0 ? ((memoryUsage / memoryLimit) * 100).toFixed(2) : 0;

            console.log(
                `[ContainerStats][${containerName}] Memory: ${memoryUsage} / ${memoryLimit} (${memoryPercent}%)`
            );
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
                console.log(
                    `[ContainerMonitor][${containerName}] Container stopped. Status: ${status.status}`
                );
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
            /\d+\s+passing/i, // "1 passing", "2 passing", etc.
            /PASSED\s+in\s+Android/i, // "PASSED in Android"
            /✓.*should.*launch.*app/i, // Checkmark with test description
            /Test\s+passed:/i, // "Test passed:"
            /Test\s+completed\s+successfully/i, // "Test completed successfully"
        ];

        const failurePatterns = [
            /\d+\s+failing/i, // "1 failing", "2 failing", etc.
            /FAILED\s+in\s+Android/i, // "FAILED in Android"
            /✗.*should.*launch.*app/i, // X mark with test description
            /Test\s+failed:/i, // "Test failed:"
            /AssertionError/i, // Assertion errors
            /Error:/i, // General errors
        ];

        // Check if any success patterns match
        const hasSuccessIndicators = successPatterns.some((pattern) => pattern.test(outputBuffer));

        // Check if any failure patterns match
        const hasFailureIndicators = failurePatterns.some((pattern) => pattern.test(outputBuffer));

        // Additional check for spec completion percentage
        const specCompletionMatch = outputBuffer.match(
            /Spec\s+Files:\s+\d+\s+passed.*\((\d+)%\s+completed\)/i
        );
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
                'crashed',
            ];

            const detectedErrors = errorPatterns.filter(
                (pattern) => outputBuffer.includes(pattern) || errorBuffer.includes(pattern)
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
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async shutdown() {
        if (this.worker) {
            await this.worker.close();
            console.log('Enhanced Test Worker shut down gracefully');
        }
    }
} // Fermeture de la classe

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
