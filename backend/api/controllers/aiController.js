const { GoogleGenAI } = require("@google/genai");

// Access your API key from environment variable
// Ensure GEMINI_API_KEY is set in your backend/.env file
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateTestWithAI = async (req, res) => {
  const { description, name, applicationId } = req.body;

  if (!description || !name) {
    return res.status(400).json({ message: "Test description and name are required." });
  }

  try {
    const promptContent = `
      Generate a WebdriverIO (Appium) test script in JavaScript for a mobile application.
      The test should be named: "${name}".
      The purpose of the test is: "${description}".
      
      The script should follow standard WebdriverIO and Mocha/Jasmine syntax (describe, it, async/await).
      Include comments explaining the steps.
      Focus on clarity and correctness.
      Assume necessary selectors will be available (e.g., accessibility IDs, XPaths).
      Provide only the JavaScript code block for the test script, without any surrounding markdown like \`\`\`javascript or \`\`\`.

      Example of a simple interaction:
      it('should tap a button', async () => {
        const button = await $('~myButtonAccessibilityID');
        await button.click();
        // Add assertions here
      });
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContent,
    });
    
    // Extract the generated script text
    const scriptText = response.text;
    
    // Clean up any potential markdown formatting
    const script = scriptText.replace(/^\s*```javascript\n|\n```\s*$/g, '').trim();

    res.status(200).json({
      message: "Test script generated successfully",
      testScript: script,
      testName: name
    });

  } catch (error) {
    console.error('Error generating test with AI:', error);
    let errorMessage = "Failed to generate test script.";
    if (error.message) {
        errorMessage += " " + error.message;
    }
    res.status(500).json({ message: errorMessage });
  }
};

module.exports = {
  generateTestWithAI
};