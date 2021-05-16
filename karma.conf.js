module.exports = function(config) {
  config.set({

    frameworks: ["mocha", "karma-typescript", "mocha"],

    files: [
      { pattern: "src/**/*.ts" },
      { pattern: "tests/*.ts" }
    ],

    preprocessors: {
      "**/*.ts": ["karma-typescript"]
    },

    reporters: ["mocha", "karma-typescript"],

    browsers: ["ChromeHeadless"],

    singleRun: true,

    client: {
      captureConsole: true
    },

    browserConsoleLogOptions: {
      terminal: true,
      level: ""
    }
  });
};