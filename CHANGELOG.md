# Introduction
This page outlines the changes made with each Mutation Summary release.

# Releases
* [1.0.0 (May 15, 2021)](#100-may-15-2021)
* [0.2.0 (May 14, 2021)](#020-may-14-2021)
* [0.1.1 (May 2017)](#011-2017)


## 1.0.0 (May 15, 2021)
[1.0.0 Release Milestone](https://github.com/mmacfadden/mutation-summary/milestone/2?closed=1)

### Enhancements
* **Remove Legacy Checks ([#5](https://github.com/mmacfadden/mutation-summary/issues/5))**: Removed checks for legacy MutationObserver functions that are no longer needed.
* **Refactor into Modules ([#6](https://github.com/mmacfadden/mutation-summary/issues/6))**: Break out the code into separate files and implement Typescript modules.
* **Reorganized Docs ([#7](https://github.com/mmacfadden/mutation-summary/issues/7))**: Reorganized the documentation into a subdirectory.
* **CI Build ([#8](https://github.com/mmacfadden/mutation-summary/issues/8))**: Implemented a CI build using GitHub Actions.
* **Headless Tests ([#9](https://github.com/mmacfadden/mutation-summary/issues/9))**: Converted the tests to headless using Karma.
* **Typedoc API ([#10](https://github.com/mmacfadden/mutation-summary/issues/10))**: Added tsdoc / typedoc api.


## 0.2.0 (May 14, 2021)
[0.2.0 Release Milestone](https://github.com/mmacfadden/mutation-summary/milestone/1?closed=1)

### Enhancements
* **Improved Build System ([#2](https://github.com/mmacfadden/mutation-summary/issues/2))**: The package.json was updated to add scripts and dependencies for scripted builds.
* **Add a CHANGELOG ([#3](https://github.com/mmacfadden/mutation-summary/issues/3))**: A CHANGELOG has been added to annotate changes in each release.
* **Add Source Maps ([#4](https://github.com/mmacfadden/mutation-summary/issues/4))**: Sourcemaps to map from JavaScript to TypeScript have been added.

### Bug Fixes

* **Fixed Typescript Errors ([#1](https://github.com/mmacfadden/mutation-summary/issues/1))**: Several errors that the current typescript compiler complains about have been fixed.

## 0.1.1 (2017)

* **Initial Release**