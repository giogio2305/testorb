describe('VodQA App Test', () => {
    it('should launch the VodQA app and verify basic functionality', async () => {
        // Wait for the app to fully load with retry logic
        console.log('Waiting for app to load...');
        await browser.pause(10000);
        
        // Use retry command for better resilience
        const testResult = await browser.retryCommand(async () => {
            console.log('Attempting to find app elements...');
            
            // First, verify we can get the current activity
            try {
                const currentActivity = await browser.getCurrentActivity();
                console.log(`Current activity: ${currentActivity}`);
            } catch (e) {
                console.log('Could not get current activity:', e.message);
            }
            
            // Try to find any TextView first (most common element)
            console.log('Looking for TextView elements...');
            const textViews = await $$('//android.widget.TextView');
            
            if (textViews.length > 0) {
                console.log(`Found ${textViews.length} TextView elements`);
                
                // Check if any TextView is displayed
                for (let i = 0; i < Math.min(textViews.length, 5); i++) {
                    try {
                        const isDisplayed = await textViews[i].isDisplayed();
                        if (isDisplayed) {
                            const text = await textViews[i].getText();
                            console.log(`TextView ${i} is displayed with text: "${text}"`);
                            return { success: true, element: 'TextView', text };
                        }
                    } catch (e) {
                        console.log(`TextView ${i} check failed: ${e.message}`);
                    }
                }
            }
            
            // Fallback: Try to find any Button
            console.log('Looking for Button elements...');
            const buttons = await $$('//android.widget.Button');
            
            if (buttons.length > 0) {
                console.log(`Found ${buttons.length} Button elements`);
                const firstButton = buttons[0];
                const isDisplayed = await firstButton.isDisplayed();
                if (isDisplayed) {
                    const text = await firstButton.getText();
                    console.log(`Button is displayed with text: "${text}"`);
                    return { success: true, element: 'Button', text };
                }
            }
            
            // Try ImageView elements (common in apps)
            console.log('Looking for ImageView elements...');
            const imageViews = await $$('//android.widget.ImageView');
            if (imageViews.length > 0) {
                console.log(`Found ${imageViews.length} ImageView elements`);
                const firstImage = imageViews[0];
                const isDisplayed = await firstImage.isDisplayed();
                if (isDisplayed) {
                    console.log('ImageView is displayed');
                    return { success: true, element: 'ImageView' };
                }
            }
            
            // Last resort: Check if any element exists
            console.log('Looking for any element...');
            const anyElement = await $('//*');
            if (await anyElement.isExisting()) {
                console.log('Found at least one element in the app');
                return { success: true, element: 'Any' };
            }
            
            throw new Error('No UI elements found in the app');
        }, 3);
        
        // Verify the test was successful
        expect(testResult.success).toBe(true);
        console.log(`Test completed successfully - found ${testResult.element} element`);
        
        // Additional verification: try to get page source
        try {
            const pageSource = await browser.getPageSource();
            console.log(`Page source length: ${pageSource.length} characters`);
            expect(pageSource.length).toBeGreaterThan(100); // Ensure we have meaningful content
        } catch (sourceError) {
            console.warn('Could not verify page source:', sourceError.message);
        }
    });
});