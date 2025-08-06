const { GoogleGenAI } = require('@google/genai');

// Access your API key from environment variable
// Ensure GEMINI_API_KEY is set in your backend/.env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateTestWithAI = async (req, res) => {
    const { description, name, applicationId } = req.body;

    if (!description || !name) {
        return res.status(400).json({ message: 'Test description and name are required.' });
    }

    try {
        const promptContent = `
      Generate a robust WebdriverIO (Appium) test script in JavaScript for a mobile Android application.
      The test should be named: "${name}".
      The purpose of the test is: "${description}".

      CRITICAL REQUIREMENTS FOR ROBUST TEST GENERATION:

      1. PROPER ASYNC/AWAIT STRUCTURE (MANDATORY):
         - ALL code using 'await' MUST be inside async functions
         - Use proper describe/it structure with async functions
         - NEVER place await statements at the top level of the file
         - Example structure:
           describe('Test Suite', () => {
             it('should do something', async () => {
               // await statements go here
             });
           });

      2. SELECTOR STRATEGY (MANDATORY):
         - NEVER use generic accessibility selectors like '~username', '~password', '~loginButton'
         - Use specific UiSelector strategies with multiple fallback options:
           * Primary: android.widget.EditText with resourceId (e.g., 'com.app.package:id/username_field')
           * Secondary: className + text combination
           * Tertiary: XPath with specific attributes
         - Example robust selector patterns:
           const usernameField = await $('android=new UiSelector().resourceId("com.example.app:id/username_input")');
           const passwordField = await $('android=new UiSelector().className("android.widget.EditText").instance(1)');
           const loginButton = await $('android=new UiSelector().text("Login").className("android.widget.Button")');

      3. ERROR HANDLING & STABILITY:
         - Add explicit waits before each interaction: await driver.waitUntil(async () => await element.isDisplayed(), { timeout: 10000 });
         - Include try-catch blocks for critical operations
         - NEVER use driver.reset() as it's deprecated in Appium 2.0
         - Use modern app lifecycle management instead

      4. ASSERTIONS & VERIFICATION:
         - Use specific element verification instead of generic checks
         - Add multiple assertion points throughout the test
         - Verify element states before interactions (isDisplayed, isEnabled)

      5. BEST PRACTICES:
         - Use async/await consistently ONLY inside async functions
         - Add descriptive comments for each step
         - Use explicit timeouts for all wait operations
         - Implement proper cleanup in afterEach hooks
         - Include screenshot capture on failures

      6. STRUCTURE REQUIREMENTS:
         - Follow standard WebdriverIO and Mocha syntax (describe, it, beforeEach, afterEach)
         - Include proper test setup and teardown
         - Add meaningful test descriptions
         - ENSURE all await statements are inside async functions

      MANDATORY TEMPLATE STRUCTURE:
      describe('${name}', () => {
        const appPackage = process.env.APP_PACKAGE_NAME || 'com.vodqareactnative';
        const apkPath = "/opt/resources/"${process.env.APK_FILE_NAME};
        let sessionActive = false;
        let appInitialized = false;

        before(async function() {
            this.timeout(300000); // 5 minutes pour l'initialisation

            try {
                console.log('=== Initialisation globale ===');
                console.log('APK Path:', apkPath);
                console.log('App Package:', appPackage);

                // Vérification des variables d'environnement
                if (!appPackage || appPackage === 'undefined') {
                    throw new Error('APP_PACKAGE_NAME environment variable is not defined');
                }

                // Installation unique de l'app si nécessaire
                if (!appInitialized) {
                    try {
                        await driver.installApp(apkPath);
                        console.log('Application installée');
                    } catch (e) {
                        console.log('App déjà installée ou erreur ignorée:', e.message);
                    }
                    appInitialized = true;
                }

            } catch (error) {
                console.error('Erreur d\'initialisation:', error.message);
                throw error;
            }
        });

        beforeEach(async function() {
            this.timeout(120000); // 2 minutes

            try {
                console.log('=== Préparation du test ===');
                console.log('Using app package:', appPackage);

                // Vérification que appPackage est défini
                if (!appPackage || appPackage === 'undefined') {
                    throw new Error('APP_PACKAGE_NAME is not properly defined');
                }

                // Nettoyage léger sans réinstallation
                try {
                    await driver.terminateApp(appPackage); // Syntaxe correcte pour terminateApp
                    await driver.pause(2000);
                } catch (e) {
                    console.log('App non active (normal):', e.message);
                }

                // Démarrage de l'application
                await driver.activateApp(appPackage);

                // Attente de stabilisation
                await driver.waitUntil(async () => {
                    try {
                        const activity = await driver.getCurrentActivity();
                        return activity && activity.includes('MainActivity');
                    } catch (e) {
                        return false;
                    }
                }, {
                    timeout: 30000,
                    interval: 2000
                });

                sessionActive = true;
                console.log('=== Test prêt ===');

            } catch (error) {
                console.error('Erreur beforeEach:', error.message);
                sessionActive = false;
                throw error;
            }
        });

        it('should ${description.toLowerCase()}', async () => {
          try {
            // Step 1: Wait for and interact with first element
            const firstElement = await $('android=new UiSelector().resourceId("' + appPackage + ':id/element1")');
            await driver.waitUntil(async () => await firstElement.isDisplayed(), { timeout: 10000 });
            await firstElement.setValue('value');

            // Step 2: Verify element state and continue
            expect(await firstElement.getValue()).toBe('value');

            // Add more steps as needed...

          } catch (error) {
            console.error('Test failed:', error.message);
            throw error;
          }
        });

        afterEach(async function() {
          try {
            console.log('=== Nettoyage après test ===');

            // Fermeture de l'application après chaque test
            if (appPackage && sessionActive) {
              try {
                await driver.terminateApp(appPackage); // Syntaxe correcte pour terminateApp
                console.log('Application fermée');
              } catch (e) {
                console.log('Erreur lors de la fermeture de l\'app:', e.message);
              }
            }

            sessionActive = false;

          } catch (error) {
            console.error('Erreur dans afterEach:', error.message);
          }
        });

        after(async function() {
          try {
            console.log('=== Nettoyage final ===');

            // Fermeture définitive de l'application
            if (appPackage) {
              try {
                await driver.terminateApp(appPackage); // Syntaxe correcte pour terminateApp
                console.log('Application fermée définitivement');
              } catch (e) {
                console.log('App déjà fermée ou erreur ignorée:', e.message);
              }
            }

            // Optionnel : désinstaller l'app si nécessaire
            // await driver.removeApp(appPackage);

          } catch (error) {
            console.error('Erreur dans after:', error.message);
          }
        });
      });

      CRITICAL SYNTAX RULES:
      - NEVER use 'await' outside of async functions
      - ALL test functions (it, beforeEach, afterEach) that use await MUST be marked as async
      - Use the dynamic appPackage variable from environment instead of hardcoded values
      - Use the dynamic apkPath variable from environment instead of hardcoded paths
      - Use specific resourceId patterns that match Android conventions
      - Avoid generic selectors that cause UiAutomator2 crashes
      - Include proper error handling to prevent instrumentation failures
      - Add sufficient wait times for element loading
      - NEVER use driver.reset() - use terminateApp/activateApp sequence instead

      IMPORTANT NOTES:
      - The generated code will be executed in a WebdriverIO/Mocha environment
      - Ensure all syntax is valid JavaScript with proper async/await usage
      - Test the structure: describe() -> it(async () => { await ... })
      - Never place await statements at the module level
      - Use modern Appium 2.0 app lifecycle management
      - Use environment variables for APK path and package name for dynamic configuration

      Provide only the JavaScript code block for the test script, without any surrounding markdown.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptContent,
        });

        // Extract the generated script text
        const scriptText = response.text;

        // Clean up any potential markdown formatting
        const script = scriptText.replace(/^\s*```javascript\n|\n```\s*$/g, '').trim();

        res.status(200).json({
            message: 'Test script generated successfully',
            testScript: script,
            testName: name,
        });
    } catch (error) {
        console.error('Error generating test with AI:', error);
        let errorMessage = 'Failed to generate test script.';
        if (error.message) {
            errorMessage += ' ' + error.message;
        }
        res.status(500).json({ message: errorMessage });
    }
};

const modifyTestWithAI = async (req, res) => {
    const { originalText, prompt, context } = req.body;

    if (!originalText || !prompt) {
        return res
            .status(400)
            .json({ message: 'Original test and modification prompt are required.' });
    }

    try {
        const promptContent = `
You are an expert code editor and test script optimizer. Your task is to modify the provided code/text according to the user's instructions.

ORIGINAL TEST CODE:
\`\`\`
${originalText}
\`\`\`

USER MODIFICATION REQUEST:
${prompt}

${
    context
        ? `ADDITIONAL CONTEXT:
${context}`
        : ''
}

INSTRUCTIONS:
1. Carefully analyze the original text/code
2. Apply the requested modifications while preserving the overall structure and functionality
3. If it's test code, ensure it remains valid WebdriverIO/Appium syntax
4. If it's JavaScript, maintain proper async/await patterns
5. Preserve important comments and structure unless specifically asked to change them
6. If the modification request is unclear, make reasonable assumptions and apply best practices

Provide ONLY the modified text/code without any surrounding markdown or explanations.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptContent,
        });

        // Extract the modified text
        const modifiedText = response.text;

        // Clean up any potential markdown formatting
        const cleanedText = modifiedText.replace(/^\s*```[a-zA-Z]*\n|\n```\s*$/g, '').trim();

        res.status(200).json({
            message: 'Test modified successfully',
            originalText,
            modifiedText: cleanedText,
            prompt,
        });
    } catch (error) {
        console.error('Error modifying test with AI:', error);
        let errorMessage = 'Failed to modify test.';
        if (error.message) {
            errorMessage += ' ' + error.message;
        }
        res.status(500).json({ message: errorMessage });
    }
};

module.exports = {
    generateTestWithAI,
    modifyTestWithAI,
};
