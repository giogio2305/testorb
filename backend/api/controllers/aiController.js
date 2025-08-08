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
         - ALWAYS use the findElementWithFallback() helper function provided in the template
         - Create arrays of fallback selectors for each element, ordered from most specific to most generic:
           * Primary: resourceId with app package (e.g., 'android=new UiSelector().resourceId("com.app.package:id/element_id")')
           * Secondary: accessibility id ('~elementName')
           * Tertiary: className with instance ('android=new UiSelector().className("android.widget.EditText").instance(0)')
           * Quaternary: XPath with attributes ('//*[@content-desc="element"]')
           * Fallback: text or description contains ('android=new UiSelector().textContains("element")')
         - Example robust selector implementation:
           const usernameSelectors = [
               '~username',
               \`android=new UiSelector().resourceId("\${appPackage}:id/username")\`,
               'android=new UiSelector().className("android.widget.EditText").instance(0)',
               '//*[@content-desc="username"]',
               'android=new UiSelector().textContains("username")'
           ];
           const usernameField = await findElementWithFallback(usernameSelectors, 'Champ Username');

      3. ERROR HANDLING & STABILITY:
         - ALWAYS use the retryAction() helper function for interactions that might fail
         - Include automatic screenshot capture on failures (already implemented in helpers)
         - NEVER use driver.reset() as it's deprecated in Appium 2.0
         - Use modern app lifecycle management with terminateApp/activateApp
         - Example retry implementation:
           await retryAction(async () => {
               await element.clearValue();
               await element.setValue('value');
           }, 'Saisie dans le champ');
         - Validate session state before critical operations: if (!sessionActive) throw new Error('Session inactive');

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
        const appPackage = process.env.APP_PACKAGE_NAME &&
            process.env.APP_PACKAGE_NAME !== 'undefined' &&
            process.env.APP_PACKAGE_NAME.trim() !== ''
                ? process.env.APP_PACKAGE_NAME
                : 'com.vodqareactnative';
        const apkPath = \`/opt/resources/\${process.env.APK_FILE_NAME}\`;
        let sessionActive = false;
        let appInitialized = false;

        // Helper function for robust element finding with fallback selectors
        const findElementWithFallback = async (selectors, elementName) => {
            for (const selector of selectors) {
                try {
                    console.log(\`Tentative avec sélecteur: \${selector}\`);
                    const element = await driver.$(selector);
                    await element.waitForDisplayed({ timeout: 15000 });
                    if (await element.isDisplayed()) {
                        console.log(\`✓ \${elementName} trouvé avec: \${selector}\`);
                        return element;
                    }
                } catch (e) {
                    console.log(\`✗ Échec avec \${selector}:\`, e.message);
                }
            }
            await driver.saveScreenshot(\`./\${elementName.replace(/\\s+/g, '-').toLowerCase()}-not-found.png\`);
            throw new Error(\`\${elementName} introuvable avec tous les sélecteurs\`);
        };

        // Helper function for retry logic
        const retryAction = async (action, actionName, maxRetries = 3) => {
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await action();
                    console.log(\`✓ \${actionName} réussi\`);
                    return;
                } catch (e) {
                    if (i === maxRetries - 1) throw e;
                    console.log(\`Retry \${actionName} \${i + 1}/\${maxRetries}\`);
                    await driver.pause(2000);
                }
            }
        };

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
                    await driver.terminateApp(appPackage);
                    await driver.pause(2000);
                } catch (e) {
                    console.log('App non active (normal)');
                }

                // Démarrage de l'application
                await driver.activateApp(appPackage);

                // Attente de stabilisation avec validation d'activité
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

        it('should ${description.toLowerCase()}', async function() {
            this.timeout(180000); // 3 minutes

            try {
                console.log('=== Début du test ===');

                // Vérification préalable de la session
                if (!sessionActive) {
                    throw new Error('Session non active au début du test');
                }

                // Attente de stabilisation
                await driver.pause(5000);

                // Vérifier que l'interface est bien chargée
                await driver.waitUntil(async () => {
                    try {
                        const source = await driver.getPageSource();
                        // Adapter cette condition selon votre interface
                        return source.length > 1000; // Interface basique chargée
                    } catch (e) {
                        console.log("Attente du chargement de l'interface...");
                        return false;
                    }
                }, {
                    timeout: 60000,
                    timeoutMsg: 'Interface non chargée',
                    interval: 3000
                });

                // EXEMPLE D'UTILISATION DES HELPERS :
                // Recherche d'un élément avec fallback (adaptez les sélecteurs selon votre app)
                /*
                const elementSelectors = [
                    '~elementAccessibilityId',
                    \`android=new UiSelector().resourceId("\${appPackage}:id/element_id")\`,
                    'android=new UiSelector().className("android.widget.EditText").instance(0)',
                    '//*[@content-desc="element"]',
                    \`//android.widget.EditText[@resource-id="\${appPackage}:id/element_id"]\`
                ];
                
                const element = await findElementWithFallback(elementSelectors, 'Element Name');
                
                // Interaction avec retry automatique
                await retryAction(async () => {
                    await element.clearValue();
                    await element.setValue('test value');
                }, 'Saisie dans l\'élément');
                
                // Vérification
                const value = await element.getValue();
                expect(value).toBe('test value');
                */

                // TODO: Remplacez ce commentaire par votre logique de test spécifique
                // Utilisez findElementWithFallback() et retryAction() pour plus de robustesse
                
                console.log('=== Test réussi ===');
                
            } catch (error) {
                console.error('=== Erreur dans le test ===', error.message);
                sessionActive = false;

                // Capture d'écran finale pour diagnostic
                try {
                    await driver.saveScreenshot(\`./test-error-final-\${Date.now()}.png\`);
                    console.log("Capture d'écran finale sauvegardée");
                } catch (e) {
                    console.log("Impossible de capturer l'écran final:", e.message);
                }

                throw error;
            }
        });

        afterEach(async function() {
            this.timeout(30000);

            try {
                // Capture d'écran uniquement en cas d'échec
                if (this.currentTest && this.currentTest.state === 'failed') {
                    try {
                        await driver.saveScreenshot(\`./error-\${Date.now()}.png\`);
                        console.log("Capture d'écran d'échec sauvegardée");
                    } catch (e) {
                        console.log('Capture échouée:', e.message);
                    }
                }

                // Nettoyage minimal
                sessionActive = false;
                
            } catch (e) {
                console.log('Erreur afterEach (ignorée):', e.message);
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
      - ALWAYS use findElementWithFallback() instead of direct element selection
      - ALWAYS use retryAction() for interactions that might fail (setValue, click, etc.)
      - Use the dynamic appPackage variable from environment instead of hardcoded values
      - Use the dynamic apkPath variable from environment instead of hardcoded paths
      - Create comprehensive selector arrays with multiple fallback options
      - Include session validation: check sessionActive before critical operations
      - NEVER use driver.reset() - use terminateApp/activateApp sequence instead
      - Always include meaningful element names in findElementWithFallback() calls for better debugging

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
You are an expert WebdriverIO/Appium test script optimizer. Your task is to modify the provided test code according to the user's instructions while following strict Appium best practices.

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

CRITICAL APPIUM REQUIREMENTS:
1. **MANDATORY ELEMENT FINDING**: Always use multiple fallback selectors for robustness:
   - accessibility id (~elementName)
   - android UiSelector with resourceId
   - android UiSelector with className and instance
   - xpath with content-desc
   - xpath with resource-id
   - android UiSelector with textContains
   - android UiSelector with descriptionContains

2. **MANDATORY RETRY MECHANISMS**: Implement retry logic for ALL actions:
   - Use try-catch blocks with 3 retry attempts
   - Add \`await driver.pause(2000)\` between retries
   - Log each retry attempt with descriptive messages

3. **MANDATORY WAIT STRATEGIES**: Always use proper waits:
   - \`await element.waitForDisplayed({ timeout: 15000 })\` before interactions
   - \`await driver.waitUntil()\` for complex conditions
   - Verify element visibility with \`await element.isDisplayed()\`

4. **MANDATORY ERROR HANDLING**: Include comprehensive error management:
   - Capture screenshots on failures: \`await driver.saveScreenshot('./error-description.png')\`
   - Log detailed error messages with context
   - Provide diagnostic information (current activity, page source)

5. **FORBIDDEN PRACTICES**: NEVER use these (they don't exist or are unreliable):
   - Non-existent WebdriverIO methods
   - Single selector strategies without fallbacks
   - Actions without proper waits
   - Missing error handling

VALID WEBDRIVERIO/APPIUM METHODS ONLY:
- \`driver.\$()\`, \`element.waitForDisplayed()\`, \`element.isDisplayed()\`
- \`element.click()\`, \`element.setValue()\`, \`element.clearValue()\`
- \`driver.pause()\`, \`driver.waitUntil()\`, \`driver.saveScreenshot()\`
- \`driver.getPageSource()\`, \`driver.getCurrentActivity()\`

STRUCTURE REQUIREMENTS:
- Maintain async/await patterns throughout
- Preserve test hooks (before, beforeEach, afterEach)
- Keep logging and diagnostic capabilities
- Use descriptive variable names and comments

ERROR ANALYSIS:
If the user mentions specific Appium errors:
- StaleElementReferenceError: Re-find elements before each interaction
- TimeoutError: Increase timeouts and add more fallback selectors
- NoSuchElementError: Implement more selector strategies
- WebDriverError: Add proper waits and error handling

Provide ONLY the modified test code without any surrounding markdown or explanations.
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
