const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// État global du serveur
let isTestRunning = false;
let currentTestSession = null;

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    testRunning: isTestRunning,
    uptime: process.uptime()
  });
});

// Endpoint pour exécuter les tests
app.post('/run-test', async (req, res) => {
  if (isTestRunning) {
    return res.status(409).json({ 
      error: 'Test already running', 
      sessionId: currentTestSession 
    });
  }

  const { applicationId, apkFileName, appPackageName, testSpecs } = req.body;
  
  if (!apkFileName) {
    return res.status(400).json({ error: 'APK file name is required' });
  }

  const sessionId = `test_${Date.now()}`;
  currentTestSession = sessionId;
  isTestRunning = true;

  try {
    // Préparer les variables d'environnement
    const env = {
      ...process.env,
      APK_FILE_NAME: apkFileName,
      APPLICATION_ID: applicationId,
      APP_PACKAGE_NAME: appPackageName || ''
    };

    // Construire la commande de test
    let testCommand = 'npx wdio run wdio.conf.js';
    if (testSpecs) {
      testCommand += ` --spec ${testSpecs}`;
    }

    console.log(`[${sessionId}] Starting test execution:`, testCommand);

    // Exécuter les tests
    const testProcess = exec(testCommand, { 
      env,
      cwd: '/usr/src/app',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    let output = '';
    let errorOutput = '';

    testProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(`[${sessionId}] stdout:`, chunk);
    });

    testProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error(`[${sessionId}] stderr:`, chunk);
    });

    testProcess.on('close', (code) => {
      isTestRunning = false;
      currentTestSession = null;
      
      console.log(`[${sessionId}] Test completed with exit code:`, code);
      
      // Sauvegarder les résultats
      const resultFile = `/usr/src/app/results/${sessionId}.json`;
      const results = {
        sessionId,
        exitCode: code,
        success: code === 0,
        output,
        errorOutput,
        timestamp: new Date().toISOString(),
        applicationId,
        apkFileName
      };
      
      fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
    });

    res.json({ 
      sessionId, 
      status: 'started',
      message: 'Test execution initiated' 
    });

  } catch (error) {
    isTestRunning = false;
    currentTestSession = null;
    console.error(`[${sessionId}] Error starting test:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint pour vérifier le statut d'un test
app.get('/test-status/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const resultFile = `/usr/src/app/results/${sessionId}.json`;
  
  if (fs.existsSync(resultFile)) {
    const results = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
    res.json({ status: 'completed', results });
  } else if (currentTestSession === sessionId) {
    res.json({ status: 'running', sessionId });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Endpoint pour arrêter un test en cours
app.post('/stop-test', (req, res) => {
  if (!isTestRunning) {
    return res.json({ message: 'No test currently running' });
  }
  
  // Logique pour arrêter le test en cours
  // (implementation dépendante du contexte)
  
  res.json({ message: 'Test stop requested' });
});

// Créer le répertoire des résultats
if (!fs.existsSync('/usr/src/app/results')) {
  fs.mkdirSync('/usr/src/app/results', { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Ready to accept test requests');
});

module.exports = app;