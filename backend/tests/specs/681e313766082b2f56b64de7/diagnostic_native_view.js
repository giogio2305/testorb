const { expect } = require('@wdio/globals');

// Environment variables
const appPackage = process.env.APP_PACKAGE_NAME || 'com.wdiodemoapp';
const apkPath = process.env.APK_PATH || '/opt/resources/Android-NativeDemoApp-0.4.0.apk';

describe('Diagnostic Native View', () => {
  let appInitialized = false;
  let sessionActive = false;

  before(async function() {
    this.timeout(300000); // 5 minutes for initialisation

    try {
      console.log('=== Diagnostic Initialization ===');
      console.log('APK Path:', apkPath);
      console.log('App Package:', appPackage);

      // Check environment variables
      if (!appPackage || appPackage === 'undefined') {
        throw new Error('APP_PACKAGE_NAME environment variable is not defined or is "undefined"');
      }

      // Install app only once if needed
      if (!appInitialized) {
        try {
          const isInstalled = await driver.isAppInstalled(appPackage);
          if (!isInstalled) {
            console.log(`App ${appPackage} not found, installing from ${apkPath}`);
            await driver.installApp(apkPath);
            console.log('Application installed successfully');
          } else {
            console.log('Application already installed, skipping installation.');
          }
        } catch (e) {
          console.error('Error during app installation or check:', e.message);
          throw e;
        }
        appInitialized = true;
      }

    } catch (error) {
      console.error('Before hook failed:', error.message);
      throw error;
    }
  });

  beforeEach(async function() {
    this.timeout(120000); // 2 minutes for each test setup

    try {
      console.log('=== Starting Diagnostic Test ===');
      
      // Launch the application
      await driver.activateApp(appPackage);
      sessionActive = true;
      console.log('Application launched');
      
      // Wait for app to load
      await driver.pause(3000);
      
    } catch (error) {
      console.error('BeforeEach hook failed:', error.message);
      throw error;
    }
  });

  it('should diagnose Native View page structure', async function() {
    this.timeout(120000); // 2 minutes timeout

    try {
      console.log('=== DIAGNOSTIC: Capturing initial page structure ===');
      
      // Get initial page source
      const initialPageSource = await driver.getPageSource();
      console.log('\n=== INITIAL PAGE SOURCE ===');
      console.log(initialPageSource);
      
      // Try to login first
      console.log('\n=== DIAGNOSTIC: Attempting login ===');
      
      // Find username field with basic selectors
      const usernameSelectors = [
        '~username',
        'android=new UiSelector().className("android.widget.EditText").instance(0)',
        '//*[@content-desc="username"]'
      ];
      
      let usernameFound = false;
      for (const selector of usernameSelectors) {
        try {
          console.log(`Trying username selector: ${selector}`);
          const element = await driver.$(selector);
          await element.waitForExist({ timeout: 5000 });
          if (await element.isDisplayed()) {
            await element.setValue('admin');
            console.log(`✓ Username field found with: ${selector}`);
            usernameFound = true;
            break;
          }
        } catch (e) {
          console.log(`✗ Username selector failed: ${selector} - ${e.message}`);
        }
      }
      
      if (!usernameFound) {
        console.log('Username field not found, capturing current page structure...');
        const currentPageSource = await driver.getPageSource();
        console.log('\n=== CURRENT PAGE SOURCE (after username attempt) ===');
        console.log(currentPageSource);
        return;
      }
      
      // Find password field
      const passwordSelectors = [
        '~password',
        'android=new UiSelector().className("android.widget.EditText").instance(1)',
        '//*[@content-desc="password"]'
      ];
      
      let passwordFound = false;
      for (const selector of passwordSelectors) {
        try {
          console.log(`Trying password selector: ${selector}`);
          const element = await driver.$(selector);
          await element.waitForExist({ timeout: 5000 });
          if (await element.isDisplayed()) {
            await element.setValue('admin');
            console.log(`✓ Password field found with: ${selector}`);
            passwordFound = true;
            break;
          }
        } catch (e) {
          console.log(`✗ Password selector failed: ${selector} - ${e.message}`);
        }
      }
      
      if (!passwordFound) {
        console.log('Password field not found, capturing current page structure...');
        const currentPageSource = await driver.getPageSource();
        console.log('\n=== CURRENT PAGE SOURCE (after password attempt) ===');
        console.log(currentPageSource);
        return;
      }
      
      // Find login button
      const loginSelectors = [
        '~loginBtn',
        'android=new UiSelector().className("android.widget.Button").text("LOG IN")',
        'android=new UiSelector().text("LOG IN")'
      ];
      
      let loginFound = false;
      for (const selector of loginSelectors) {
        try {
          console.log(`Trying login selector: ${selector}`);
          const element = await driver.$(selector);
          await element.waitForExist({ timeout: 5000 });
          if (await element.isDisplayed()) {
            await element.click();
            console.log(`✓ Login button found with: ${selector}`);
            loginFound = true;
            break;
          }
        } catch (e) {
          console.log(`✗ Login selector failed: ${selector} - ${e.message}`);
        }
      }
      
      if (!loginFound) {
        console.log('Login button not found, capturing current page structure...');
        const currentPageSource = await driver.getPageSource();
        console.log('\n=== CURRENT PAGE SOURCE (after login attempt) ===');
        console.log(currentPageSource);
        return;
      }
      
      // Wait for navigation
      await driver.pause(5000);
      
      console.log('\n=== DIAGNOSTIC: After login page structure ===');
      const afterLoginPageSource = await driver.getPageSource();
      console.log('\n=== AFTER LOGIN PAGE SOURCE ===');
      console.log(afterLoginPageSource);
      
      // Try to find Native View item
      const nativeViewSelectors = [
        '~Native View',
        'android=new UiSelector().text("Native View")',
        '//*[@text="Native View"]'
      ];
      
      let nativeViewFound = false;
      for (const selector of nativeViewSelectors) {
        try {
          console.log(`Trying Native View selector: ${selector}`);
          const element = await driver.$(selector);
          await element.waitForExist({ timeout: 5000 });
          if (await element.isDisplayed()) {
            await element.click();
            console.log(`✓ Native View item found with: ${selector}`);
            nativeViewFound = true;
            break;
          }
        } catch (e) {
          console.log(`✗ Native View selector failed: ${selector} - ${e.message}`);
        }
      }
      
      if (!nativeViewFound) {
        console.log('Native View item not found, test complete.');
        return;
      }
      
      // Wait for Native View page to load
      await driver.pause(5000);
      
      console.log('\n=== DIAGNOSTIC: Native View Demo page structure ===');
      const nativeViewPageSource = await driver.getPageSource();
      console.log('\n=== NATIVE VIEW DEMO PAGE SOURCE ===');
      console.log(nativeViewPageSource);
      
      // Try to find all text elements on the page
      console.log('\n=== DIAGNOSTIC: Finding all text elements ===');
      try {
        const allTextElements = await driver.$$('android=new UiSelector().className("android.widget.TextView")');
        console.log(`Found ${allTextElements.length} TextView elements`);
        
        for (let i = 0; i < allTextElements.length; i++) {
          try {
            const text = await allTextElements[i].getText();
            const isDisplayed = await allTextElements[i].isDisplayed();
            console.log(`TextView ${i}: "${text}" (displayed: ${isDisplayed})`);
          } catch (e) {
            console.log(`TextView ${i}: Error getting text - ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`Error finding TextViews: ${e.message}`);
      }
      
      console.log('\n=== DIAGNOSTIC COMPLETE ===');
      
    } catch (error) {
      console.error('Diagnostic test failed:', error.message);
      
      // Capture final page source on error
      try {
        const errorPageSource = await driver.getPageSource();
        console.log('\n=== ERROR PAGE SOURCE ===');
        console.log(errorPageSource);
      } catch (sourceError) {
        console.error(`Failed to get error page source: ${sourceError.message}`);
      }
      
      throw error;
    }
  });

  afterEach(async function() {
    try {
      console.log('=== Cleanup After Diagnostic Test ===');
      
      if (appPackage && sessionActive) {
        try {
          await driver.terminateApp(appPackage);
          console.log('Application closed');
        } catch (e) {
          console.log('Error closing app:', e.message);
        }
      }
      sessionActive = false;
    } catch (error) {
      console.error('AfterEach cleanup failed:', error.message);
    }
  });
});