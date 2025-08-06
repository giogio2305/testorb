
const { Worker } = require('bullmq');
const { exec } = require('child_process');
const path = require('path');
const ContainerManager = require('../services/containerManager');
const TestResult = require('../models/TestResult');

// Determine the correct docker-compose command based on OS
// This is a simplified check; you might need a more robust solution for different environments
const dockerComposeCmd = process.platform === 'win32' ? 'docker-compose' : 'docker compose';

// Assuming your test_runner service in docker-compose.yml is named 'app'
const TEST_RUNNER_SERVICE_NAME = 'app'; 

const containerManager = new ContainerManager();

const worker = new Worker('test-queue', async job => {
    const { applicationId, apkFileName, appPackageName } = job.data;
    console.log(`[TestWorker] Received job for app ${applicationId}, APK: ${apkFileName}, Package: ${appPackageName}`);

    // Update job progress to indicate start
    await job.updateProgress(5);
    await job.log('Test job started - checking prerequisites');

    if (!apkFileName) {
        const errorMsg = 'apkFileName is missing. Cannot run tests.';
        console.error(`[TestWorker] Error: ${errorMsg}`);
        await job.log(`Error: ${errorMsg}`);
        throw new Error(errorMsg);
    }

    // Ensure containers are running and healthy
    await job.updateProgress(10);
    await job.log('Ensuring Docker containers are ready...');
    await containerManager.ensureServicesRunning();
    await job.log('All containers are ready for testing');

    // Construct the command to execute WebdriverIO tests inside the test_runner container
    // The working directory for wdio is usually the root of the tests project inside the container
    // The `app` service in docker-compose.yml mounts ./backend/tests to /usr/src/app
    // So, wdio commands should be run from /usr/src/app
    const command = `${dockerComposeCmd} exec -T -e APK_FILE_NAME=${apkFileName} -e APP_PACKAGE_NAME=${appPackageName || ''} ${TEST_RUNNER_SERVICE_NAME} npx wdio run wdio.conf.js`;

    console.log(`[TestWorker] Executing command: ${command}`);
    await job.updateProgress(30);
    await job.log(`Executing command: ${command}`);

    return new Promise((resolve, reject) => {
        const testProcess = exec(command, {
            // cwd: path.resolve(__dirname, '../../') // Set CWD to project root where docker-compose.yml is
        });

        let outputBuffer = '';
        let errorBuffer = '';

        testProcess.stdout.on('data', async (data) => {
            const output = data.toString();
            outputBuffer += output;
            console.log(`[TestWorker][${applicationId}] stdout: ${output}`);
            await job.log(`stdout: ${output.trim()}`);
            
            // Update progress based on output patterns
            if (output.includes('Starting WebDriver session')) {
                await job.updateProgress(40);
            } else if (output.includes('Running tests')) {
                await job.updateProgress(60);
            } else if (output.includes('Test execution')) {
                await job.updateProgress(80);
            }
        });

        testProcess.stderr.on('data', async (data) => {
            const error = data.toString();
            errorBuffer += error;
            console.error(`[TestWorker][${applicationId}] stderr: ${error}`);
            await job.log(`stderr: ${error.trim()}`);
        });

        testProcess.on('close', async (code) => {
            if (code === 0) {
                console.log(`[TestWorker][${applicationId}] Test execution completed successfully.`);
                await job.updateProgress(100);
                await job.log('Test execution completed successfully');
                resolve({ 
                    success: true, 
                    message: 'Tests completed successfully',
                    output: outputBuffer,
                    exitCode: code
                });
            } else {
                const errorMsg = `Test execution failed with exit code ${code}`;
                console.error(`[TestWorker][${applicationId}] ${errorMsg}`);
                await job.log(errorMsg);
                if (errorBuffer) {
                    await job.log(`Error details: ${errorBuffer}`);
                }
                reject(new Error(`${errorMsg}. Error output: ${errorBuffer}`));
            }
        });

        testProcess.on('error', async (err) => {
            const errorMsg = `Failed to start test execution: ${err.message}`;
            console.error(`[TestWorker][${applicationId}] ${errorMsg}`);
            await job.log(errorMsg);
            reject(err);
        });
    });
}, {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    },
    // concurrency: 1 // Optional: limit how many test jobs run at once
});

console.log('Test worker started and listening for jobs on test-queue...');

worker.on('completed', (job, result) => {
  console.log(`[TestWorker] Job ${job.id} completed. Result:`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[TestWorker] Job ${job.id} failed. Error:`, err.message);
});

// Dans la fonction de traitement des jobs
const processTestJob = async (job) => {
    const { applicationId, apkFileName, appPackageName } = job.data;
    
    try {
        // ... existing test execution code ...
        
        // Parse test results from WebDriverIO output
        const testResults = parseTestResults(stdout, applicationId, job.id);
        
        // Save results to database
        for (const result of testResults) {
            const testResult = new TestResult(result);
            await testResult.save();
        }
        
        return { success: true, results: testResults };
    } catch (error) {
        // ... error handling ...
    }
};

// Function to parse WebDriverIO output and extract test results
const parseTestResults = (output, applicationId, jobId) => {
    const results = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
        // Parse lines like: Test "Login Test" passed in 5000ms (retries: 0)
        const testMatch = line.match(/Test "(.+?)" (passed|failed) in (\d+)ms \(retries: (\d+)\)/);
        if (testMatch) {
            results.push({
                application: applicationId,
                testName: testMatch[1],
                testFile: 'extracted from logs',
                status: testMatch[2],
                duration: parseInt(testMatch[3]),
                retries: parseInt(testMatch[4]),
                jobId: jobId
            });
        }
    }
    
    return results;
};
