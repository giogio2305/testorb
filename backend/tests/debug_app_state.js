const { remote } = require('webdriverio');

async function debugAppState() {
    const driver = await remote({
        hostname: 'localhost',
        port: 4723,
        path: '/',
        capabilities: {
            platformName: 'Android',
            'appium:platformVersion': '11',
            'appium:deviceName': 'Android Emulator',
            'appium:app': '/opt/resources/1746809142912-VodQA.apk',
            'appium:automationName': 'UiAutomator2',
            'appium:udid': 'mobile-e2e-android-1:5555',
            'appium:appPackage': 'com.vodqareactnative',
            'appium:appActivity': '.MainActivity',
            'appium:fullReset': false,
            'appium:noReset': true,
            'appium:autoGrantPermissions': true
        }
    });

    try {
        console.log('=== APP STATE DIAGNOSIS ===');
        
        // Check if app is installed
        const isInstalled = await driver.isAppInstalled('com.vodqareactnative');
        console.log('App installed:', isInstalled);
        
        // Get current activity
        const currentActivity = await driver.getCurrentActivity();
        console.log('Current activity:', currentActivity);
        
        // Get current package
        const currentPackage = await driver.getCurrentPackage();
        console.log('Current package:', currentPackage);
        
        // Get page source
        const pageSource = await driver.getPageSource();
        console.log('\n=== PAGE SOURCE ===');
        console.log(pageSource);
        
        // Try to find any elements
        console.log('\n=== ELEMENT SEARCH ===');
        
        // Search for common element types
        const elementTypes = [
            'android.widget.EditText',
            'android.widget.Button', 
            'android.widget.TextView',
            'android.view.View'
        ];
        
        for (const elementType of elementTypes) {
            try {
                const elements = await driver.$$(`android=new UiSelector().className("${elementType}")`);
                console.log(`Found ${elements.length} elements of type ${elementType}`);
                
                for (let i = 0; i < Math.min(elements.length, 3); i++) {
                    try {
                        const text = await elements[i].getText();
                        const isDisplayed = await elements[i].isDisplayed();
                        const resourceId = await elements[i].getAttribute('resource-id');
                        const contentDesc = await elements[i].getAttribute('content-desc');
                        
                        console.log(`  ${elementType}[${i}]: text="${text}", displayed=${isDisplayed}, resourceId="${resourceId}", contentDesc="${contentDesc}"`);
                    } catch (e) {
                        console.log(`  ${elementType}[${i}]: Error reading properties - ${e.message}`);
                    }
                }
            } catch (e) {
                console.log(`Error finding ${elementType} elements:`, e.message);
            }
        }
        
    } catch (error) {
        console.error('Diagnosis error:', error.message);
    } finally {
        await driver.deleteSession();
    }
}

debugAppState().catch(console.error);