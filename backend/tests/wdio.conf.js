const path = require('path');

exports.config = {
  //
  // ====================
  // Runner Configuration
  // ====================
  //
  //webdriverIO allows it to run your tests in arbitrary locations (e.g locally or
  // on a remote machine)clear
  hostname: "appium", // This should point to your appium service name in docker-compose
  port: 4723,
  path: "/", // Changed from "/wd/hub" to match Appium 2.x server base path
  //
  // ==================
  // Specify Test Files
  // ==================
  // Define which test specs should run. The pattern is relative to the directory
  // from which `wdio` was called.
  //
  // The specs are defined as an array of spec files (optionally using wildcards
  // that will be expanded). The test for each spec file will be run in a separate
  // worker process. In order to have a group of spec files run in the same worker
  // process simply enclose them in an array within the specs array.
  //
  // If you are calling `wdio` from an NPM script (see https://docs.npmjs.com/cli/run-script),
  // then the current working directory is where your `package.json` resides, so `wdio`
  // will be called from there.
  //
  specs: [
    // './specs/agent/000_*/001*.js',
    // './specs/agent/200_*/*.js',
    // './specs/agent/300_*/*.js',
    // './specs/agent/400_*/*.js',
    // './specs/agent/500_*/*.js',
    // './specs/agent/800_*/*.js',
    //"./specs/agent/1300*/*.js",
    "./specs/**/*.js",
  ],
  // Patterns to exclude.
  exclude: [
    //"./specs/agent/800_*/*.js",
    // './specs/agent/400_*/*.js',
    // "./specs/agent/600_*/*.js",
    // './specs/agent/800_*/801*.js',
    // "./specs/agent/800_*/802*.js",
    // './specs/agent/800_*/803*.js',
    // "./specs/agent/800_*/805*.js",
    // './specs/agent/800_*/807*.js',
    // './specs/agent/900_*/*.js',
    // 'path/to/excluded/files'
    // "./specs/agent/1300_*/*.js",
  ],

  //
  // ============
  // Capabilities
  // ============
  // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
  // time. Depending on the number of capabilities, WebdriverIO launches several test
  // sessions. Within your capabilities you can overwrite the spec and exclude options in
  // order to group specific specs to a specific capability.
  //
  // First, you can define how many instances should be started at the same time. Let's
  // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
  // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
  // files and you set maxInstances to 10, all spec files will get tested at the same time
  // and 30 processes will get spawned. The property handles how many capabilities
  // from the same test should run tests.
  //
  maxInstances: 1,
  //
  // If you have trouble getting all important capabilities together, check out the
  // Sauce Labs platform configurator - a great tool to configure your capabilities:
  // https://docs.saucelabs.com/reference/platforms-configurator
  //
  capabilities: [
    {
      "platformName": "Android",
      "appium:platformVersion": "11", // Or your target Android version
      "appium:deviceName": "Android Emulator", // Or a more specific name if needed
      // "appium:app": "/opt/resources/smobilpay.apk", // Old static path
      "appium:app": process.env.APK_FILE_NAME ? `/opt/resources/${process.env.APK_FILE_NAME}` : '/opt/resources/1746808942489-VodQA.apk', // Dynamic APK path
      // "appPackage": "com.smobilpayagentapp", // Optional: specify if known
      //   appWaitActivity: "host.exp.exponent.MainActivity", // Optional: specify if known
      //   appActivity: "host.exp.exponent.MainActivity", // Optional: specify if known
      "appium:automationName": "UiAutomator2",
      "appium:udid": "android:5555", // Connect to existing emulator
      "appium:fullReset": false, // Set to true if you want a clean session every time, false to keep app data
      "appium:noReset": true,    // Set to true to not reset app state between sessions (if fullReset is false)
      // "autoGrantPermissions": "true", // Deprecated, use appium:autoGrantPermissions
      "appium:autoGrantPermissions": true, // Grant all permissions automatically
      "appium:newCommandTimeout": 600,
      "appium:uiautomator2ServerInstallTimeout": 60000,
      "appium:uiautomator2ServerLaunchTimeout": 60000,
      "appium:androidInstallTimeout": 90000,
      "appium:adbExecTimeout": 60000,
      "appium:ignoreUnimportantViews": false
    },
  ],
  //
  // ===================
  // Test Configurations
  // ===================
  // Define all options that are relevant for the WebdriverIO instance here
  //
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: "warn",
  //
  // Set specific log levels per logger
  // loggers:
  // - webdriver, webdriverio
  // - @wdio/browserstack-service, @wdio/devtools-service, @wdio/sauce-service
  // - @wdio/mocha-framework, @wdio/jasmine-framework
  // - @wdio/local-runner
  // - @wdio/sumologic-reporter
  // - @wdio/cli, @wdio/config, @wdio/utils
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  // logLevels: {
  //     webdriver: 'info',
  //     '@wdio/appium-service': 'info'
  // },
  //
  // If you only want to run your tests until a specific amount of tests have failed use
  // bail (default is 0 - don't bail, run all tests).
  bail: 0,
  //
  // Set a base URL in order to shorten url command calls. If your `url` parameter starts
  // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
  // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
  // gets prepended directly.
  baseUrl: "http://localhost",
  //
  // Default timeout for all waitFor* commands.
  waitforTimeout: 30000,
  //
  // Default timeout in milliseconds for request
  // if browser driver or grid doesn't send response
  connectionRetryTimeout: 180000,
  //
  // Default request retries count
  connectionRetryCount: 5,
  //
  // Test runner services
  // Services take over a specific job you don't want to take care of. They enhance
  // your test setup with almost no effort. Unlike plugins, they don't add new
  // commands. Instead, they hook themselves up into the test process.
  // services: [['appium', { command: 'appium', args: { basePath: '/' }, install: false }]], 

  // Framework you want to run your specs with.
  // The following are supported: Mocha, Jasmine, and Cucumber
  // see also: https://webdriver.io/docs/frameworks
  //
  // Make sure you have the wdio adapter package for the specific framework installed
  // before running any tests.
  framework: "mocha",
  //
  // The number of times to retry the entire specfile when it fails as a whole
  // specFileRetries: 1,
  //
  // Delay in seconds between the spec file retry attempts
  // specFileRetriesDelay: 0,
  //
  // Whether or not retried specfiles should be retried immediately or deferred to the end of the queue
  // specFileRetriesDeferred: false,
  //
  // Test reporter for stdout.
  // The only one supported by default is 'dot'
  // see also: https://webdriver.io/docs/dot-reporter
  reporters: ["spec"],

  //
  // Options to be passed to Mocha.
  // See the full list at http://mochajs.org/
  mochaOpts: {
    ui: "bdd",
    timeout: 120000,
    retries: 2
  },
  //
  // =====
  // Hooks
  // =====
  // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
  // it and to build services around it. You can either apply a single function or an array of
  // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
  // resolved to continue.
  /**
   * Gets executed once before all workers get launched.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   */
  onPrepare: function (config, capabilities) {
    console.log('--- WDIO onPrepare Hook ---');
    console.log('APK_FILE_NAME:', process.env.APK_FILE_NAME);
    if (!process.env.APK_FILE_NAME) {
      console.warn('Warning: APK_FILE_NAME environment variable is not set. Appium might not find the APK.');
      // You could set a default or throw an error if an APK is always required
      // For now, the capabilities will use 'default.apk'
    }
    console.log('Test preparation started...');
    // If you need to dynamically set the app path for each capability:
    // capabilities.forEach(cap => {
    //   if (process.env.APK_FILE_NAME) {
    //     cap['appium:app'] = `/opt/resources/${process.env.APK_FILE_NAME}`;
    //   } else {
    //     cap['appium:app'] = '/opt/resources/default.apk'; // Fallback
    //   }
    // });
  },
  /**
   * Gets executed before a worker process is spawned and can be used to initialise specific service
   * for that worker as well as modify runtime environments in an async fashion.
   * @param  {String} cid      capability id (e.g 0-0)
   * @param  {[type]} caps     object containing capabilities for session that will be spawn in the worker
   * @param  {[type]} specs    specs to be run in the worker process
   * @param  {[type]} args     object that will be merged with the main configuration once worker is initialised
   * @param  {[type]} execArgv list of string arguments passed to the worker process
   */
  // onWorkerStart: function (cid, caps, specs, args, execArgv) {
  // },
  /**
   * Gets executed just before initialising the webdriver session and test framework. It allows you
   * to manipulate configurations depending on the capability or spec.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that are to be run
   */
  beforeSession: function (config, capabilities, specs) {
    console.log('Starting new WebDriver session...');
    console.log('Capabilities:', JSON.stringify(capabilities, null, 2));
  },
  /**
   * Gets executed before test execution begins. At this point you can access to all global
   * variables like `browser`. It is the perfect place to define custom commands.
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs        List of spec file paths that are to be run
   * @param {Object}         browser      instance of created browser/device session
   */
  before: function (capabilities, specs) {
    console.log('Test session started successfully');
    // Add global retry logic for UiAutomator2 issues
    browser.addCommand('retryCommand', async function (command, maxRetries = 3) {
      let lastError;
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await command();
        } catch (error) {
          lastError = error;
          console.log(`Command failed (attempt ${i + 1}/${maxRetries}): ${error.message}`);
          if (i < maxRetries - 1) {
            await browser.pause(2000); // Wait before retry
          }
        }
      }
      throw lastError;
    });
  },
  /**
   * Runs before a WebdriverIO command gets executed.
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   */
  // beforeCommand: function (commandName, args) {
  // },
  /**
   * Hook that gets executed before the suite starts
   * @param {Object} suite suite details
   */
  // beforeSuite: function (suite) {
  // },
  /**
   * Function to be executed before a test (in Mocha/Jasmine) starts.
   */
  // beforeTest: function (test, context) {
  // },
  /**
   * Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
   * beforeEach in Mocha)
   */
  // beforeHook: function (test, context) {
  // },
  /**
   * Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
   * afterEach in Mocha)
   */
  // afterHook: function (test, context, { error, result, duration, passed, retries }) {
  // },
  /**
   * Function to be executed after a test (in Mocha/Jasmine).
   */
  afterTest: function(test, context, { error, result, duration, passed, retries }) {
    if (error) {
      console.log(`Test failed: ${test.title}`);
      console.log(`Error: ${error.message}`);
      console.log(`Duration: ${duration}ms, Retries: ${retries}`);
    } else {
      console.log(`Test passed: ${test.title} (${duration}ms)`);
    }
  },

  /**
   * Hook that gets executed after the suite has ended
   * @param {Object} suite suite details
   */
  // afterSuite: function (suite) {
  // },
  /**
   * Runs after a WebdriverIO command gets executed
   * @param {String} commandName hook command name
   * @param {Array} args arguments that command would receive
   * @param {Number} result 0 - command success, 1 - command error
   * @param {Object} error error object if any
   */
  // afterCommand: function (commandName, args, result, error) {
  // },
  /**
   * Gets executed after all tests are done. You still have access to all global variables from
   * the test.
   * @param {Number} result 0 - test pass, 1 - test fail
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // after: function (result, capabilities, specs) {
  // },
  /**
   * Gets executed right after terminating the webdriver session.
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {Array.<String>} specs List of spec file paths that ran
   */
  // afterSession: function (config, capabilities, specs) {
  // },
  /**
   * Gets executed after all workers got shut down and the process is about to exit. An error
   * thrown in the onComplete hook will result in the test run failing.
   * @param {Object} exitCode 0 - success, 1 - fail
   * @param {Object} config wdio configuration object
   * @param {Array.<Object>} capabilities list of capabilities details
   * @param {<Object>} results object containing test results
   */
  // onComplete: function(exitCode, config, capabilities, results) {
  // },
  /**
   * Gets executed when a refresh happens.
   * @param {String} oldSessionId session ID of the old session
   * @param {String} newSessionId session ID of the new session
   */
  //onReload: function(oldSessionId, newSessionId) {
  //}
};
