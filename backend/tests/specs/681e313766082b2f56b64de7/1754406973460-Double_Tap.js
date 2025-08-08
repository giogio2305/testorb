describe('Double Tap', () => {
  // Use environment variable for app package name, with a common default for VodQA React Native app
  const appPackage = process.env.APP_PACKAGE_NAME || 'com.vodqareactnative';
  // Use environment variable for APK path, with a reasonable default placeholder
  const apkPath = process.env.APK_PATH || './app/vodqa.apk';

  let sessionActive = false; // Flag to track if an Appium session is active for cleanup
  let appInitialized = false; // Flag to ensure app installation/check happens only once

  /**
   * Helper function to find an element robustly using multiple selectors.
   * It iterates through the provided selectors, trying to find and wait for the first one that is displayed.
   *
   * @param {Array<string>} selectors - An array of WebdriverIO selector strings (e.g., `android=new UiSelector().resourceId(...)`, `xpath://...`).
   * @param {number} [timeout=15000] - Total timeout in milliseconds to wait for any of the elements to become displayed.
   * @param {string} [timeoutMsg='Element not found or displayed within timeout.'] - Message to display if timeout occurs.
   * @returns {Promise<WebdriverIO.Element>} The first element found that is displayed.
   * @throws {Error} If no element is found or becomes displayed within the timeout.
   */
  async function getRobustElement(selectors, timeout = 15000, timeoutMsg = 'Element not found or displayed within timeout.') {
    let foundElement = null;
    let lastErrorDetails = '';

    await driver.waitUntil(async () => {
      for (const selector of selectors) {
        try {
          // Attempt to find the element using the current selector
          const el = await $(selector);
          // Check if the element exists and is currently displayed
          // Added check for isEnabled() as well, as a displayed but disabled button is not useful
          if (await el.isDisplayed() && await el.isEnabled()) {
            foundElement = el; // Store the found element
            console.log(`[getRobustElement] Element found, displayed, and enabled using selector: "${selector}"`);
            return true; // Success: element found and displayed
          } else if (await el.isDisplayed() && !(await el.isEnabled())) {
            lastErrorDetails = `Selector "${selector}" found but element is not enabled.` + (el.elementId ? ` (ID: ${el.elementId})` : '');
            // console.warn(`[getRobustElement] Warning: ${lastErrorDetails}`); // Uncomment for more detailed debug logs
          }
        } catch (e) {
          // Log a warning if a selector fails, but continue trying other selectors
          lastErrorDetails = `Selector "${selector}" failed or element not displayed: ${e.message}`;
          // console.warn(`[getRobustElement] Warning: ${lastErrorDetails}`); // Uncomment for more detailed debug logs
        }
      }
      return false; // No element found/displayed/enabled with any selector in this iteration, continue waiting
    }, {
      timeout: timeout,
      interval: 500, // Check every 500ms
      timeoutMsg: `${timeoutMsg} (Last attempt error: ${lastErrorDetails || 'None'})`
    });

    if (!foundElement) {
      // This case should ideally be caught by the `waitUntil` timeout, but as a safeguard:
      throw new Error(`[getRobustElement] Failed to find any element after waiting: ${timeoutMsg}`);
    }
    return foundElement;
  }


  before(async function() {
    this.timeout(300000); // Global setup timeout: 5 minutes

    try {
      console.log('=== Initialisation globale ===');
      console.log('App Package:', appPackage);
      console.log('APK Path:', apkPath);

      // CRITICAL REQUIREMENT: Verify environment variables are properly set
      if (!appPackage || appPackage === 'undefined' || appPackage.trim() === '') {
        throw new Error('APP_PACKAGE_NAME environment variable is not defined or is empty.');
      }
      if (!apkPath || apkPath === 'undefined' || apkPath.trim() === '' || apkPath.includes('/path/to/your/app.apk')) {
        console.warn('WARNING: APK_PATH environment variable is not defined or is using a default placeholder. App installation might fail. Please set it correctly (e.g., /path/to/your/app.apk or C:\\Users\\...\\vodqa.apk).');
      }

      // CRITICAL REQUIREMENT: Install app only once if not already installed
      if (!appInitialized) {
        try {
          const isInstalled = await driver.isAppInstalled(appPackage);
          if (!isInstalled) {
            console.log(`Application ${appPackage} not installed. Installing from ${apkPath}...`);
            await driver.installApp(apkPath);
            console.log('Application installée avec succès.');
          } else {
            console.log(`Application ${appPackage} déjà installée.`);
          }
        } catch (e) {
          // If installation fails, check if app is present anyway (e.g., manually installed)
          const isInstalledAfterError = await driver.isAppInstalled(appPackage);
          if (!isInstalledAfterError) {
              console.error(`CRITICAL: App ${appPackage} could not be installed and is not present. Check APK_PATH: ${apkPath} and permissions.`);
              throw new Error(`App installation failed: ${e.message}`);
          }
          console.log(`App installation failed, but application ${appPackage} is somehow present. Continuing cautiously. Error: ${e.message}`);
        }
        appInitialized = true;
      }

    } catch (error) {
      console.error('Erreur d\'initialisation globale:', error.message);
      throw error;
    }
  });

  beforeEach(async function() {
    this.timeout(120000); // beforeEach timeout: 2 minutes

    try {
      console.log('=== Préparation du test ===');
      console.log('Using app package:', appPackage);

      // CRITICAL REQUIREMENT: Ensure appPackage is valid for operations
      if (!appPackage || appPackage === 'undefined') {
        throw new Error('APP_PACKAGE_NAME is not properly defined for beforeEach operations.');
      }

      // CRITICAL REQUIREMENT: Proper app lifecycle management (terminate/activate instead of reset)
      // Terminate app to ensure a clean state for each test
      try {
        await driver.terminateApp(appPackage);
        await driver.pause(2000); // Small pause to allow app to fully close
        console.log(`Application ${appPackage} terminated.`);
      } catch (e) {
        // This is expected if the app wasn't running, so log and continue
        console.log(`Warning: Could not terminate app ${appPackage} (may not be active): ${e.message}`);
      }

      // Activate (start) the application
      await driver.activateApp(appPackage);
      console.log(`Application ${appPackage} activated.`);

      // CRITICAL REQUIREMENT: Wait for app stabilization (e.g., reaching main activity)
      await driver.waitUntil(async () => {
        try {
          const activity = await driver.getCurrentActivity();
          // Check for common initial activities. Adjust based on the actual app's main/login activity.
          return activity && (activity.includes('MainActivity') || activity.includes('LoginActivity') || activity.includes('AuthActivity') || activity.includes('SplashActivity'));
        } catch (e) {
          // Log error but don't rethrow, just return false to continue waiting
          console.log('Waiting for initial activity. Error (expected during wait):', e.message);
          return false;
        }
      }, {
        timeout: 30000, // Wait up to 30 seconds for the app to stabilize
        interval: 2000, // Check every 2 seconds
        timeoutMsg: 'Timed out waiting for app to reach a stable initial activity after activation.'
      });
      console.log('App is stable and ready for interaction.');
      sessionActive = true; // Mark session as active
      console.log('=== Test prêt ===');

    } catch (error) {
      console.error('Erreur during beforeEach hook:', error.message);
      sessionActive = false; // Mark session as not active if beforeEach fails
      throw error; // Propagate error to fail the test run
    }
  });

  it('should perform double tap interaction', async () => {
    // --- Step 1: Login to the application ---
    try {
      console.log('Attempting login with username "admin" and password "admin"');

      // Robust selector for Username field
      const usernameField = await getRobustElement([
        `android=new UiSelector().resourceId("${appPackage}:id/username")`,
        `android=new UiSelector().className("android.widget.EditText").instance(0)`,
        `xpath://android.widget.EditText[@text='Username']`
      ], 15000, 'Username field not displayed after 15s.');
      await usernameField.setValue('admin');
      // CRITICAL REQUIREMENT: Assertions after interaction
      expect(await usernameField.getText()).toBe('admin');
      console.log('Entered "admin" into username field.');

      // Robust selector for Password field
      const passwordField = await getRobustElement([
        `android=new UiSelector().resourceId("${appPackage}:id/password")`,
        `android=new UiSelector().className("android.widget.EditText").instance(1)`,
        `xpath://android.widget.EditText[@text='Password']`
      ], 10000, 'Password field not displayed after 10s.');
      await passwordField.setValue('admin'); // Changed password to "admin" as per request
      // Removed assertion for password field getText() as it often returns obscured characters (e.g., "••••")
      console.log('Entered "admin" into password field.');

      // Robust selector for Login button - Modified based on user's successful strategies
      const loginButton = await getRobustElement([
        // Most specific and reliable first
        `android=new UiSelector().resourceId("${appPackage}:id/login")`,           // Corrected resourceId based on user's successful snippet
        `xpath://*[@resource-id="${appPackage}:id/login"]`,                       // XPath for resourceId
        `~login`,                                                                  // Accessibility ID for 'login'
        `xpath://*[@content-desc="login"]`,                                        // XPath for content-desc 'login'
        // Then more generic but common selectors, considering non-button elements acting as buttons
        `android=new UiSelector().text("Login").className("android.widget.Button")`, // Original text+className
        `xpath://android.widget.Button[@text='Login']`,                           // Original XPath
        `android=new UiSelector().textContains("Login").clickable(true)`,          // Flexible textContains, ensuring it's clickable
        `android=new UiSelector().textContains("Sign In").clickable(true)`,        // Alternative text, ensuring clickable
        `android=new UiSelector().descriptionContains("login").clickable(true)`,   // Flexible descriptionContains, ensuring clickable
        `android=new UiSelector().className("android.widget.Button")`,             // Generic button class
        `android=new UiSelector().className("android.widget.TextView").textContains("Login").clickable(true)` // Handles TextViews acting as buttons
      ], 15000, 'Login button not displayed or enabled after 15s.'); // Increased timeout to 15s as per user's observation
      await loginButton.click();
      console.log('Clicked Login button.');

      // --- Step 2: Navigate to "Double Tap" demo from Samples List ---
      console.log('Navigating to "Double Tap Demo" page.');

      // Robust selector for "Samples List" title verification
      const samplesListTitle = await getRobustElement([
        `android=new UiSelector().text("Samples List")`,
        `android=new UiSelector().resourceId("${appPackage}:id/samplesListTitle")`, // Example ID, adjust if actual app has one
        `xpath://android.widget.TextView[@text='Samples List']`
      ], 15000, 'Samples List title not displayed after login.');
      expect(await samplesListTitle.isDisplayed()).toBe(true); // Redundant but harmless, as getRobustElement ensures visibility
      console.log('Verified "Samples List" page is displayed.');

      // Robust selector for "Double Tap" item in the list (using UiScrollable for robustness if list is long)
      const doubleTapListItem = await getRobustElement([
        `android=new UiSelector().text("Double Tap")`,
        `xpath://android.widget.TextView[@text='Double Tap']`,
        // Note: UiScrollable needs to be handled differently if it's the primary way to find the element
        // For UiScrollable to work, it often needs to be the root of the UiSelector.
        // A common pattern is: `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("Double Tap"))`
        // If a direct text/xpath doesn't work, this might be needed as a standalone selector.
        // For now, keeping it as a separate candidate.
      ], 15000, 'Double Tap list item not displayed after 15s.');
      await doubleTapListItem.click();
      console.log('Clicked "Double Tap" item in the list.');

      // Robust selector for "Double Tap Demo" title verification
      const doubleTapDemoTitle = await getRobustElement([
        `android=new UiSelector().text("Double Tap Demo")`,
        `android=new UiSelector().resourceId("${appPackage}:id/doubleTapDemoTitle")`, // Example ID
        `xpath://android.widget.TextView[@text='Double Tap Demo']`
      ], 10000, 'Double Tap Demo title not displayed after 10s.');
      expect(await doubleTapDemoTitle.isDisplayed()).toBe(true);
      console.log('Verified "Double Tap Demo" page is displayed.');

      // --- Step 3 & 4: Perform Double Tap gesture & verify/interact with modal (This part will be retried) ---
      console.log('Preparing to perform double tap and verify modal with retry mechanism.');
      const maxRetries = 3;
      let attempt = 0;
      let doubleTapAndModalSuccessful = false;
      let lastError = null;

      while (attempt < maxRetries && !doubleTapAndModalSuccessful) {
        try {
          if (attempt > 0) {
            console.log(`--- Starting retry attempt ${attempt + 1} of ${maxRetries} ---`);
            // CRITICAL: Reset app state for retry
            console.log('Resetting app state for retry...');
            await driver.terminateApp(appPackage);
            await driver.pause(1000);
            await driver.activateApp(appPackage);
            await driver.waitUntil(async () => {
              try {
                const activity = await driver.getCurrentActivity();
                return activity && (activity.includes('MainActivity') || activity.includes('LoginActivity') || activity.includes('AuthActivity') || activity.includes('SplashActivity'));
              } catch (e) {
                return false;
              }
            }, { timeout: 30000, interval: 2000, timeoutMsg: 'Timed out waiting for app to reach initial activity after restart for retry.' });
            console.log('App reactivated. Re-navigating to Double Tap Demo.');

            // Re-login and re-navigate
            await getRobustElement([`android=new UiSelector().resourceId("${appPackage}:id/username")`, `xpath://android.widget.EditText[@text='Username']`], 15000, 'Username field for retry not found.').setValue('admin');
            await getRobustElement([`android=new UiSelector().resourceId("${appPackage}:id/password")`, `xpath://android.widget.EditText[@text='Password']`], 10000, 'Password field for retry not found.').setValue('admin');
            await getRobustElement([`android=new UiSelector().resourceId("${appPackage}:id/login")`, `xpath://*[@resource-id="${appPackage}:id/login"]`], 15000, 'Login button for retry not found.').click();
            await getRobustElement([`android=new UiSelector().text("Samples List")`, `xpath://android.widget.TextView[@text='Samples List']`], 15000, 'Samples List title for retry not found.'); // Verify Samples List
            await getRobustElement([`android=new UiSelector().text("Double Tap")`, `xpath://android.widget.TextView[@text='Double Tap']`], 15000, 'Double Tap list item for retry not found.').click();
            await getRobustElement([`android=new UiSelector().text("Double Tap Demo")`, `xpath://android.widget.TextView[@text='Double Tap Demo']`], 10000, 'Double Tap Demo title for retry not found.'); // Verify Double Tap Demo page
            console.log('Re-navigation complete.');
          }

          // --- Execute double tap and modal verification ---
          const doubleTapMeButton = await getRobustElement([
            `android=new UiSelector().resourceId("${appPackage}:id/doubleTapMeBtn")`,
            `xpath://*[@resource-id="${appPackage}:id/doubleTapMeBtn"]`,
            `~doubleTapMe`,
            `xpath://*[@content-desc="doubleTapMe"]`,

            `android=new UiSelector().text("Double Tap Me").className("android.widget.Button")`,
            `xpath://android.widget.Button[@text='Double Tap Me']`,

            `android=new UiSelector().text("Double Tap Me").clickable(true)`,
            `xpath://*[@text='Double Tap Me' and @clickable='true']`,

            `android=new UiSelector().textContains("Double Tap Me").clickable(true)`,
            `xpath://*[contains(@text, 'Double Tap Me') and @clickable='true']`,

            `android=new UiSelector().className("android.widget.TextView").text("Double Tap Me").clickable(true)`,
            `android=new UiSelector().className("android.view.View").text("Double Tap Me").clickable(true)`,
            `android=new UiSelector().className("android.widget.TextView").textContains("Double Tap Me").clickable(true)`,
            `android=new UiSelector().className("android.view.View").textContains("Double Tap Me").clickable(true)`
          ], 15000, 'Double Tap Me element not displayed or enabled after 15s.');
          expect(await doubleTapMeButton.isEnabled()).toBe(true);
          console.log('Verified "Double Tap Me" element is ready.');

          const location = await doubleTapMeButton.getLocation();
          const size = await doubleTapMeButton.getSize();
          const x = location.x + size.width / 2;
          const y = location.y + size.height / 2;

          await driver.performActions([
            {
              type: 'pointer',
              id: 'finger1',
              parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown' },
                { type: 'pointerUp' },
                { type: 'pause', duration: 100 },
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown' },
                { type: 'pointerUp' },
              ],
            },
          ]);
          console.log('Performed double tap on "Double Tap Me" element using W3C Actions.');
          await driver.pause(1000); // Small pause for modal to animate in

          // Robust selector for Modal Title "Double tap" - Enhanced selectors and increased timeout
          const modalTitle = await getRobustElement([
            `android=new UiSelector().resourceId("android:id/alertTitle")`,
            `android=new UiSelector().text("Double tap").className("android.widget.TextView")`,
            `xpath://android.widget.TextView[@text='Double tap']`,
            `~Double tap`,
            `xpath://*[@content-desc="Double tap"]`,
            `android=new UiSelector().textContains("Double tap")`,
            `xpath://*[contains(@text, 'Double tap')]`,
          ], 15000, 'Modal title "Double tap" not displayed after 15s.');
          expect(await modalTitle.isDisplayed()).toBe(true);
          console.log('Verified modal title "Double tap" is displayed.');

          // Robust selector for Modal Content "Double tap successful!" - Enhanced selectors and increased timeout
          const modalContent = await getRobustElement([
            `android=new UiSelector().resourceId("android:id/message")`,
            `android=new UiSelector().text("Double tap successful!").className("android.widget.TextView")`,
            `xpath://android.widget.TextView[@text='Double tap successful!']`,
            `~Double tap successful!`,
            `xpath://*[@content-desc="Double tap successful!"]`,
            `android=new UiSelector().textContains("Double tap successful!")`,
            `xpath://*[contains(@text, 'Double tap successful!')]`,
          ], 15000, 'Modal content "Double tap successful!" not displayed after 15s.');
          expect(await modalContent.isDisplayed()).toBe(true);
          console.log('Verified modal content "Double tap successful!" is displayed.');

          // Robust selector for "Ok" button in the modal
          const okButton = await getRobustElement([
            `android=new UiSelector().resourceId("android:id/button1")`,
            `android=new UiSelector().text("Ok").className("android.widget.Button")`,
            `xpath://android.widget.Button[@text='Ok']`,
            `~Ok`,
            `xpath://*[@content-desc="Ok"]`,
            `android=new UiSelector().textContains("Ok").clickable(true)`
          ], 10000, 'Modal "Ok" button not displayed or enabled after 10s.');
          await okButton.click();
          console.log('Clicked "Ok" button on the modal.');

          // CRITICAL REQUIREMENT: Verify modal disappears after clicking Ok
          await driver.waitUntil(async () => {
            try {
              const modalTitleAfterClick = await $(`android=new UiSelector().text("Double tap")`);
              return !(await modalTitleAfterClick.isDisplayed());
            } catch (e) {
              return true; // If selector throws (element no longer exists in DOM), it means it's gone.
            }
          }, { timeout: 5000, timeoutMsg: 'Modal did not disappear after clicking Ok.' });
          console.log('Verified modal disappeared successfully.');

          doubleTapAndModalSuccessful = true; // Mark success for this iteration

        } catch (error) {
          lastError = error;
          attempt++;
          console.error(`Double Tap and Modal verification failed on attempt ${attempt}: ${error.message}`);
          await driver.saveScreenshot(`./screenshots/double-tap-modal-failure-attempt-${attempt}.png`);
          console.log(`Captured screenshot for attempt ${attempt}.`);

          if (attempt < maxRetries) {
            await driver.pause(2000); // Mandatory pause before next retry
            console.log(`Pausing for 2 seconds before retry attempt ${attempt + 1}.`);
          }
        }
      }

      if (!doubleTapAndModalSuccessful) {
        console.error(`Test "Double Tap" failed after ${maxRetries} attempts.`);
        throw lastError; // Re-throw the last error if all retries failed
      }

      console.log('Test "Double Tap" completed successfully!');

    } catch (error) {
      console.error('Test "Double Tap" failed:', error.message);
      // If the error occurred before the retry block, or the retry block failed, capture one final screenshot
      // This condition avoids double-screenshot if the retry block already took one and re-threw.
      if (!error.message.includes('after all retries')) {
         await driver.saveScreenshot('./screenshots/double-tap-final-failure.png');
      }
      throw error; // Re-throw the error to fail the test in the test runner
    }
  });

  afterEach(async function() {
    try {
      console.log('=== Nettoyage après test ===');

      // CRITICAL REQUIREMENT: Proper app lifecycle management (terminate after each test)
      // Close the application to ensure a clean slate for the next test
      if (appPackage && sessionActive) {
        try {
          await driver.terminateApp(appPackage);
          console.log(`Application ${appPackage} closed.`);
        } catch (e) {
          // Log error but don't rethrow, as it might be normal if app already closed
          console.log(`Error during app termination in afterEach (may be already closed): ${e.message}`);
        }
      }
      sessionActive = false; // Reset session active flag
    } catch (error) {
      console.error('Erreur in afterEach hook:', error.message);
      // Do not re-throw here, as afterEach failures should not block subsequent tests.
    }
  });

  after(async function() {
    try {
      console.log('=== Nettoyage final ===');

      // CRITICAL REQUIREMENT: Final cleanup after all tests in the suite
      // Ensure the application is terminated definitively after the test suite concludes
      if (appPackage) {
        try {
          await driver.terminateApp(appPackage);
          console.log(`Application ${appPackage} closed definitively.`);
        } catch (e) {
          console.log(`Error during final app termination (may be already closed): ${e.message}`);
        }
      }

      // Optional: Uncomment below if you need to uninstall the app after the entire test run
      // This is generally not done for every test run in CI/CD pipelines.
      // try {
      //   await driver.removeApp(appPackage);
      //   console.log(`Application ${appPackage} uninstalled.`);
      // } catch (e) {
      //   console.log(`Error during app uninstallation: ${e.message}`);
      // }

    } catch (error) {
      console.error('Erreur in after hook:', error.message);
      // Do not re-throw here, as after failures should not block overall test results.
    }
  });
});