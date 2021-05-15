# Upgrading

# 0.x => 1.x

The 0.x versions of Mutation Summary were built in a monolithic style and 
contributed values to the global scope and only provided a plain JavaScript
file for inclusion in a browser.  While there was an NPM module published,
it did not work well with more modern module based build system and packagers.
1.x versions moved to a module system compatible with ES6 Modules and
Typescript.

The NPM package now contains a CommonJS module, and ES6 Module, and a UMD
module that can still be hot linked in a global environment.

Users of this version should update their code to use imports such as:

## Module Usage
```typescript
import {MutationSummary} from "mutation-summary";

const ms = new MutationSummary({
  callback(summaries) {
    summaries.forEach((summary) => console.log(summary));
  },
  queries: [
    { all: true }
  ]
});
```

## UMD Global Scope Usage
If including the UMD module in an HTML file you must note that all values
exported by the module will be under the `MutationSummary` namespace.  Thus,
you will need to access the classes as follows:

```html
<script src="mutation-summary.js"></script>
<script>
const ms = new MutationSummary.MutationSummary({
  callback(summaries) {
    summaries.forEach((summary) => console.log(summary));
  },
  queries: [
      { all: true }
  ]
});
</script>
```
