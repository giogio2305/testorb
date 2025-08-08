describe('Native view', () => {
  const appPackage = process.env.APP_PACKAGE_NAME &&
      process.env.APP_PACKAGE_NAME !== 'undefined' &&
      process.env.APP_PACKAGE_NAME.trim() !== ''
          ? process.env.APP_PACKAGE_NAME
          : 'com.vodqareactnative';
  const apkPath = `/opt/resources/${process.env.APK_FILE_NAME}`;
  let sessionActive = false;
  let appInitialized = false;

  // Helper function for robust element finding with fallback selectors
  const findElementWithFallback = async (selectors, elementName) => {
      for (const selector of selectors) {
          try {
              console.log(`Tentative avec sélecteur: ${selector} pour ${elementName}`);
              const element = await driver.$(selector);
              await element.waitForDisplayed({ timeout: 15000 });
              if (await element.isDisplayed()) {
                  console.log(`✓ ${elementName} trouvé avec: ${selector}`);
                  return element;
              }
          } catch (e) {
              console.log(`✗ Échec avec ${selector} pour ${elementName}:`, e.message);
          }
      }
      await driver.saveScreenshot(`./${elementName.replace(/\s+/g, '-').toLowerCase()}-not-found.png`);
      throw new Error(`${elementName} introuvable avec tous les sélecteurs`);
  };

  // Helper function for retry logic
  const retryAction = async (action, actionName, maxRetries = 3) => {
      for (let i = 0; i < maxRetries; i++) {
          try {
              await action();
              console.log(`✓ ${actionName} réussi`);
              return;
          } catch (e) {
              if (i === maxRetries - 1) {
                  await driver.saveScreenshot(`./${actionName.replace(/\s+/g, '-').toLowerCase()}-failed-retry.png`);
                  throw e;
              }
              console.log(`✗ Tentative ${i + 1}/${maxRetries} pour ${actionName} échouée: ${e.message}. Retentative...`);
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
              throw new Error('APP_PACKAGE_NAME environment variable is not defined or is undefined');
          }
          if (!process.env.APK_FILE_NAME) {
            console.warn('APK_FILE_NAME environment variable not set. Assuming app is already installed or will be handled by driver caps.');
          }

          // Installation unique de l'app si nécessaire
          if (!appInitialized) {
              try {
                  if (apkPath && apkPath.trim() !== '/opt/resources/undefined' && apkPath.trim() !== '/opt/resources/') {
                    await driver.installApp(apkPath);
                    console.log('Application installée');
                  } else {
                    console.log('APK_FILE_NAME not provided or invalid, skipping app installation. Ensure app is pre-installed or handled by capabilities.');
                  }
              } catch (e) {
                  console.log('App déjà installée ou erreur lors de l\'installation (peut être ignorée si l\'app est déjà là):', e.message);
              }
              appInitialized = true;
          }

      } catch (error) {
          console.error('Erreur d\'initialisation globale:', error.message);
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
              throw new Error('APP_PACKAGE_NAME is not properly defined in beforeEach');
          }

          // Nettoyage léger sans réinstallation
          try {
              await driver.terminateApp(appPackage);
              await driver.pause(2000); // Give time for app to fully close
              console.log(`Application ${appPackage} terminée.`);
          } catch (e) {
              console.log(`Impossible de terminer l'application ${appPackage} (peut être non active ou autre erreur):`, e.message);
          }

          // Démarrage de l'application
          await driver.activateApp(appPackage);
          console.log(`Application ${appPackage} activée.`);

          // Attente de stabilisation avec validation d'activité
          await driver.waitUntil(async () => {
              try {
                  const activity = await driver.getCurrentActivity();
                  console.log('Current Activity:', activity);
                  return activity && activity.includes('MainActivity');
              } catch (e) {
                  console.log('Erreur lors de la vérification de l\'activité courante:', e.message);
                  return false;
              }
          }, {
              timeout: 45000,
              interval: 3000,
              timeoutMsg: 'L\'activité principale n\'est pas stable après le lancement.'
          });

          sessionActive = true;
          console.log('=== Test prêt ===');

      } catch (error) {
          console.error('Erreur beforeEach:', error.message);
          sessionActive = false;
          throw error;
      }
  });

  it('should the aim of this test is to "Test Native Views". Login as "admin" (username and password) then in "Samples List" page click on "Native View" in the list view. After in "Native View Demo", look for "Hello world, I\'m View one", "Hello world, I\'m View two" and "Hello world, I\'m View three".', async function() {
      this.timeout(180000); // 3 minutes

      try {
          console.log('=== Début du test "Native View" ===');

          // Vérification préalable de la session
          if (!sessionActive) {
              throw new Error('Session non active au début du test, relancez la session.');
          }

          // Attente de stabilisation initiale pour l'interface de login
          await driver.pause(5000);

          console.log('Étape 1: Connexion en tant qu\'admin.');

          // Selectors for Username field
          const usernameSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/username")`,
              '~username',
              'android=new UiSelector().className("android.widget.EditText").instance(0)',
              '//*[@content-desc="username"]',
              'android=new UiSelector().textContains("username")'
          ];
          const usernameField = await findElementWithFallback(usernameSelectors, 'Champ Username');
          await retryAction(async () => {
              await usernameField.clearValue();
              await usernameField.setValue('admin');
              expect(await usernameField.getText()).toBe('admin');
          }, 'Saisie du nom d\'utilisateur "admin"');

          // Selectors for Password field
          const passwordSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/password")`,
              '~password',
              'android=new UiSelector().className("android.widget.EditText").instance(1)',
              '//*[@content-desc="password"]',
              'android=new UiSelector().textContains("password")'
          ];
          const passwordField = await findElementWithFallback(passwordSelectors, 'Champ Mot de passe');
          await retryAction(async () => {
              await passwordField.clearValue();
              await passwordField.setValue('admin');
              // CRITICAL FIX: Removed assertion on password field text as getText() returns obscured characters (e.g., '•••••').
              // The success of setValue() within retryAction implies the value was set.
          }, 'Saisie du mot de passe "admin"');

          // Selectors for Login button - MODIFIED TO INCLUDE "LOG IN"
          const loginButtonSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/loginBtn")`,
              '~loginBtn',
              'android=new UiSelector().text("LOG IN")', // Added as primary based on user feedback
              'android=new UiSelector().className("android.widget.Button").text("LOG IN")', // Added as primary
              'android=new UiSelector().text("LOGIN")', // Kept as fallback
              'android=new UiSelector().className("android.widget.Button").text("LOGIN")', // Kept as fallback
              '//*[@content-desc="loginBtn"]',
              'android=new UiSelector().textContains("LOG IN")', // Robust partial match
              'android=new UiSelector().descriptionContains("LOG IN")' // Robust accessibility match
          ];
          const loginButton = await findElementWithFallback(loginButtonSelectors, 'Bouton de connexion');
          await retryAction(async () => {
              expect(await loginButton.isEnabled()).toBe(true);
              await loginButton.click();
          }, 'Clique sur le bouton de connexion');

          console.log('Étape 2: Navigation vers "Native View"');
          await driver.pause(5000); // Wait for samples list to load

          // Selectors for "Native View" list item, including scrolling if needed
          const nativeViewItemSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/NativeView")`,
              '~Native View',
              'android=new UiScrollable(new UiSelector().scrollable(true).instance(0)).scrollIntoView(new UiSelector().text("Native View"))',
              '//android.widget.TextView[@text="Native View"]',
              'android=new UiSelector().text("Native View")'
          ];
          const nativeViewItem = await findElementWithFallback(nativeViewItemSelectors, 'Élément "Native View" de la liste');
          await retryAction(async () => {
              expect(await nativeViewItem.isDisplayed()).toBe(true);
              await nativeViewItem.click();
          }, 'Clique sur l\'élément "Native View"');

          console.log('Étape 3: Vérification des textes dans "Native View Demo"');
          await driver.pause(5000); // Wait for Native View Demo page to load

          // Selectors for "Hello World, I'm View one"
          const viewOneSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/textViewOne")`, // Example resourceId
              'android=new UiSelector().text("Hello World, I\'m View one ")',
              '//android.widget.TextView[@text="Hello World, I\'m View one "]',
              '//*[@content-desc="Hello World, I\'m View one"]',
              'android=new UiSelector().textContains("Hello World, I\'m View one")'
          ];
          const viewOne = await findElementWithFallback(viewOneSelectors, '"Hello World, I\'m View one " text');
          expect(await viewOne.isDisplayed()).toBe(true);
          expect(await viewOne.getText()).toBe('Hello World, I\'m View one ');
          console.log('✓ "Hello World, I\'m View one" est affiché et correct.');

          // Selectors for "Hello World, I'm View two"
          const viewTwoSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/textViewTwo")`, // Example resourceId
              'android=new UiSelector().text("Hello World, I\'m View two ")',
              '//android.widget.TextView[@text="Hello World, I\'m View two "]',
              '//*[@content-desc="Hello World, I\'m View two"]',
              'android=new UiSelector().textContains("Hello World, I\'m View two")'
          ];
          const viewTwo = await findElementWithFallback(viewTwoSelectors, '"Hello World, I\'m View two " text');
          expect(await viewTwo.isDisplayed()).toBe(true);
          expect(await viewTwo.getText()).toBe('Hello World, I\'m View two ');
          console.log('✓ "Hello World, I\'m View two" est affiché et correct.');

          // Selectors for "Hello World, I'm View three"
          const viewThreeSelectors = [
              `android=new UiSelector().resourceId("${appPackage}:id/textViewThree")`, // Example resourceId
              'android=new UiSelector().text("Hello World, I\'m View three ")',
              '//android.widget.TextView[@text="Hello World, I\'m View three "]',
              '//*[@content-desc="Hello World, I\'m View three"]',
              'android=new UiSelector().textContains("Hello World, I\'m View three")'
          ];
          const viewThree = await findElementWithFallback(viewThreeSelectors, '"Hello World, I\'m View three " text');
          expect(await viewThree.isDisplayed()).toBe(true);
          expect(await viewThree.getText()).toBe('Hello World, I\'m View three ');
          console.log('✓ "Hello World, I\'m View three" est affiché et correct.');

          console.log('=== Test "Native View" réussi ===');

      } catch (error) {
          console.error('=== Erreur dans le test "Native View" ===', error.message);
          sessionActive = false;

          try {
              await driver.saveScreenshot(`./test-error-final-${Date.now()}.png`);
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
          if (this.currentTest && this.currentTest.state === 'failed') {
              try {
                  await driver.saveScreenshot(`./error-${this.currentTest.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`);
                  console.log(`Capture d'écran d'échec pour "${this.currentTest.title}" sauvegardée`);
              } catch (e) {
                  console.log('Capture d\'écran échouée dans afterEach:', e.message);
              }
          }

          sessionActive = false;
          
      } catch (e) {
          console.log('Erreur afterEach (ignorée):', e.message);
      }
  });

  after(async function() {
    try {
      console.log('=== Nettoyage final ===');

      if (appPackage) {
        try {
          await driver.terminateApp(appPackage);
          console.log('Application fermée définitivement');
        } catch (e) {
          console.log('App déjà fermée ou erreur ignorée:', e.message);
        }
      }

    } catch (error) {
      console.error('Erreur dans after:', error.message);
    }
  });
});