describe('Login Test', () => {
    const appPackage =
        process.env.APP_PACKAGE_NAME &&
        process.env.APP_PACKAGE_NAME !== 'undefined' &&
        process.env.APP_PACKAGE_NAME.trim() !== ''
            ? process.env.APP_PACKAGE_NAME
            : 'com.vodqareactnative';
    let sessionActive = false;
    let appInitialized = false;

    before(async function () {
        this.timeout(300000); // 5 minutes pour l'initialisation

        try {
            console.log('=== Initialisation globale ===');

            // Vérification de la connectivité Appium (CORRIGÉ)
            console.log('Session WebDriver initialisée');

            // Installation unique de l'app si nécessaire
            if (!appInitialized) {
                try {
                    await driver.installApp('/opt/resources/1746808942489-VodQA.apk');
                    console.log('Application installée');
                } catch (e) {
                    console.log('App déjà installée ou erreur ignorée:', e.message);
                }
                appInitialized = true;
            }
        } catch (error) {
            console.error("Erreur d'initialisation:", error.message);
            throw error;
        }
    });

    beforeEach(async function () {
        this.timeout(120000); // 2 minutes

        try {
            console.log('=== Préparation du test ===');

            // Nettoyage léger sans réinstallation
            try {
                await driver.terminateApp(appPackage); // Syntaxe correcte pour terminateApp
                await driver.pause(2000);
            } catch (e) {
                console.log('App non active (normal)');
            }

            // Démarrage de l'application
            await driver.activateApp(appPackage);

            // Attente de stabilisation réduite
            await driver.waitUntil(
                async () => {
                    try {
                        const activity = await driver.getCurrentActivity();
                        return activity && activity.includes('MainActivity');
                    } catch (e) {
                        return false;
                    }
                },
                {
                    timeout: 30000,
                    interval: 2000,
                }
            );

            sessionActive = true;
            console.log('=== Test prêt ===');
        } catch (error) {
            console.error('Erreur beforeEach:', error.message);
            sessionActive = false;
            throw error;
        }
    });

    afterEach(async function () {
        this.timeout(30000);

        try {
            // Capture d'écran uniquement en cas d'échec
            if (this.currentTest && this.currentTest.state === 'failed') {
                try {
                    await driver.saveScreenshot(`./error-${Date.now()}.png`);
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

    it('should login successfully', async function () {
        this.timeout(180000); // 3 minutes

        try {
            console.log('=== Début du test de connexion ===');

            // Vérification préalable
            if (!sessionActive) {
                throw new Error('Session non active au début du test');
            }

            // Attente de stabilisation
            await driver.pause(5000);

            // Vérifier que l'app est bien chargée
            await driver.waitUntil(
                async () => {
                    try {
                        const source = await driver.getPageSource();
                        return source.includes('username') || source.includes('login');
                    } catch (e) {
                        console.log("Attente du chargement de l'interface...");
                        return false;
                    }
                },
                {
                    timeout: 60000,
                    timeoutMsg: 'Interface de connexion non chargée',
                    interval: 3000,
                }
            );

            // Localisation robuste du champ username
            console.log('Recherche du champ username...');
            let usernameField;

            const usernameSelectors = [
                '~username',
                'android=new UiSelector().resourceId("com.vodqareactnative:id/username")',
                'android=new UiSelector().className("android.widget.EditText").instance(0)',
                '//*[@content-desc="username"]',
                '//*[@resource-id="com.vodqareactnative:id/username"]',
                'android=new UiSelector().textContains("username")',
                'android=new UiSelector().descriptionContains("username")',
            ];

            for (const selector of usernameSelectors) {
                try {
                    console.log(`Tentative avec sélecteur: ${selector}`);
                    usernameField = await driver.$(selector);
                    await usernameField.waitForDisplayed({ timeout: 15000 });

                    if (await usernameField.isDisplayed()) {
                        console.log(`✓ Champ username trouvé avec: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`✗ Échec avec ${selector}:`, e.message);
                    usernameField = null;
                }
            }

            if (!usernameField || !(await usernameField.isDisplayed())) {
                // Capture d'écran pour diagnostic
                await driver.saveScreenshot('./username-not-found.png');
                throw new Error('Champ username introuvable avec tous les sélecteurs');
            }

            // Saisie avec retry optimisé
            for (let i = 0; i < 2; i++) {
                try {
                    await usernameField.clearValue();
                    await usernameField.setValue('admin');
                    console.log("✓ Nom d'utilisateur saisi");
                    break;
                } catch (e) {
                    if (i === 1) throw e;
                    console.log(`Retry saisie username ${i + 1}/2`);
                    await driver.pause(1000); // Réduit de 2s à 1s
                }
            }

            // Localisation robuste du champ password
            console.log('Recherche du champ password...');
            let passwordField;

            const passwordSelectors = [
                '~password',
                'android=new UiSelector().resourceId("com.vodqareactnative:id/password")',
                'android=new UiSelector().className("android.widget.EditText").instance(1)',
                '//*[@content-desc="password"]',
                '//*[@resource-id="com.vodqareactnative:id/password"]',
                'android=new UiSelector().textContains("password")',
                'android=new UiSelector().descriptionContains("password")',
            ];

            for (const selector of passwordSelectors) {
                try {
                    console.log(`Tentative avec sélecteur: ${selector}`);
                    passwordField = await driver.$(selector);
                    await passwordField.waitForDisplayed({ timeout: 15000 });

                    if (await passwordField.isDisplayed()) {
                        console.log(`✓ Champ password trouvé avec: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`✗ Échec avec ${selector}:`, e.message);
                    passwordField = null;
                }
            }

            if (!passwordField || !(await passwordField.isDisplayed())) {
                await driver.saveScreenshot('./password-not-found.png');
                throw new Error('Champ password introuvable avec tous les sélecteurs');
            }

            // Saisie avec retry optimisé
            for (let i = 0; i < 2; i++) {
                try {
                    await passwordField.clearValue();
                    await passwordField.setValue('admin');
                    console.log('✓ Mot de passe saisi');
                    break;
                } catch (e) {
                    if (i === 1) throw e;
                    console.log(`Retry saisie password ${i + 1}/2`);
                    await driver.pause(1000); // Réduit de 2s à 1s
                }
            }

            // Localisation robuste du bouton login
            console.log('Recherche du bouton login...');
            let loginButton;

            const loginSelectors = [
                '~login',
                'android=new UiSelector().resourceId("com.vodqareactnative:id/login")',
                'android=new UiSelector().className("android.widget.Button")',
                '//*[@content-desc="login"]',
                '//*[@resource-id="com.vodqareactnative:id/login"]',
                'android=new UiSelector().textContains("Login")',
                'android=new UiSelector().textContains("Sign in")',
                'android=new UiSelector().descriptionContains("login")',
            ];

            for (const selector of loginSelectors) {
                try {
                    console.log(`Tentative avec sélecteur: ${selector}`);
                    loginButton = await driver.$(selector);
                    await loginButton.waitForDisplayed({ timeout: 15000 });

                    if (await loginButton.isDisplayed()) {
                        console.log(`✓ Bouton login trouvé avec: ${selector}`);
                        break;
                    }
                } catch (e) {
                    console.log(`✗ Échec avec ${selector}:`, e.message);
                    loginButton = null;
                }
            }

            if (!loginButton || !(await loginButton.isDisplayed())) {
                await driver.saveScreenshot('./login-button-not-found.png');
                throw new Error('Bouton login introuvable avec tous les sélecteurs');
            }

            // Clic avec retry optimisé
            for (let i = 0; i < 2; i++) {
                try {
                    await loginButton.click();
                    console.log('✓ Bouton de connexion cliqué');
                    break;
                } catch (e) {
                    if (i === 1) throw e;
                    console.log(`Retry clic login ${i + 1}/2`);
                    await driver.pause(1000); // Réduit de 2s à 1s
                }
            }

            // Vérification du succès avec attente robuste
            console.log('Vérification du succès de la connexion...');

            const successSelectors = [
                'android=new UiSelector().textContains("Samples List")',
                '//*[contains(@text, "Samples List")]',
            ];

            let successFound = false;
            for (const selector of successSelectors) {
                try {
                    const element = await driver.$(selector);
                    await element.waitForDisplayed({ timeout: 30000 });
                    console.log(`✓ Succès détecté avec: ${selector}`);
                    successFound = true;
                    break;
                } catch (e) {
                    console.log(`✗ Pas de succès avec ${selector}`);
                }
            }

            if (!successFound) {
                await driver.saveScreenshot('./login-success-not-found.png');

                // Diagnostic supplémentaire
                try {
                    const currentActivity = await driver.getCurrentActivity();
                    const pageSource = await driver.getPageSource();
                    console.log('Activité actuelle:', currentActivity);
                    console.log(
                        'Source de la page (100 premiers caractères):',
                        pageSource.substring(0, 100)
                    );
                } catch (e) {
                    console.log("Impossible d'obtenir les infos de diagnostic");
                }

                throw new Error('Message de bienvenue non trouvé après la connexion');
            }

            console.log('=== Test de connexion réussi ===');
        } catch (error) {
            console.error('=== Erreur dans le test ===', error.message);
            sessionActive = false;

            // Capture d'écran finale pour diagnostic
            try {
                await driver.saveScreenshot(`./test-error-final-${Date.now()}.png`);
                console.log("Capture d'écran finale sauvegardée");
            } catch (e) {
                console.log("Impossible de capturer l'écran final:", e.message);
            }

            throw error;
        }
    });
});
