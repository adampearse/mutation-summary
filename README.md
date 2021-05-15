# Mutation Summary

| Branch      | Status      |
| ----------- | ----------- |
| [master](https://github.com/mmacfadden/mutation-summary/tree/master)      | ![](https://github.com/mmacfadden/mutation-summary/actions/workflows/main.yml/badge.svg?branch=master)       |
| [develop](https://github.com/mmacfadden/mutation-summary/tree/develop)     | ![](https://github.com/mmacfadden/mutation-summary/actions/workflows/main.yml/badge.svg?branch=develop)        |

Mutation Summary is a JavaScript library that makes observing changes to the DOM fast, easy and safe. It's built on top [DOM Mutation Observers](http://dom.spec.whatwg.org/#mutation-observers), which is [widely supported](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver#browser_compatibility) support. Mutation Summary watches the DOM for changes, and summaries those changes in a compact and efficient set of changes.

The API is simple and easy to use. To monitor all changes in the DOM:

```typescript
const ms = new MutationSummary({
  callback(summaries: Summary[]) {
    summaries.forEach((summary: Summary) => console.log(summary));
  },
  queries: [
    { all: true }
  ]
});
```

# Getting Started 
For more detailed information on how to use Mutation Summary see these references:

* [Tutorial](docs/Tutorial.md): Check out the  for basic usage.
* [API Docs](https://mmacfadden.github.io/mutation-summary/): Explore the full Mutation Summary API.

# Why do I need it?

The raw MutationObserver API is powerful, yet complex and cumbersome to use directly. Mutation Summary does five main things for you:

  1. **It tells you how the document is different now from how it was.** As its name suggests, it summarizes what’s happened. It’s as if it takes a picture of the document when you first create it, and then again after each time it calls you back. When things have changed, it calls you with a concise description of exactly what’s different now from the last picture it took for you.
  2. **It handles any and all changes, no matter how complex.** All kinds of things can happen to the DOM: values can change and but put back to what they were, large parts can be pulled out, changed, rearranged, put back. Mutation Summary can take any crazy thing you throw at it. Go ahead, tear the document to shreds, Mutation Summary won’t even blink.
  3. **It lets you express what kinds of things you’re interested in.** It presents a query API that lets you tell it exactly what kinds of changes you’re interested in. This includes support for simple CSS-like selector descriptions of elements you care about.
  4. **It’s fast.** The time and memory it takes is dependant on number of changes that occurred (which typically involves only a few nodes) -- not the size of your document (which is commonly thousands of nodes).
  5. **It can automatically ignore changes you make during your callback.** Mutation Summary is going to call you back when changes have occurred. If you need to react to those changes by making more changes -- won’t you hear about those changes the next time it calls you back? Not unless you [ask for that](docs/APIReference.md#configuration-options). By default, it stops watching the document immediately before it calls you back and resumes watching as soon as your callback finishes.

# What is it useful for? #

Lots of things, here are some examples:

  * **Browser extensions.** Want to make a browser extension that creates a link to your mapping application whenever an  address appears in a page? You’ll need to know when those addresses appear (and disappear).
  * **Implement missing HTML capabilities.** Think building web apps is too darn hard and you know what’s missing from HTML that would make it a snap? Writing the code for the desired behavior is only half the battle--you’ll also need to know when those elements and attributes show up and what happens to them. In fact, there’s already two widely used classes of libraries which do exactly this, but don’t currently have a good way to observe changes to the DOM.
    * **UI Widget** libraries, e.g. Dojo Widgets
    * **Templating** and/or **Databinding** libraries, e.g. Angular or KnockoutJS
  * **Text Editors.** HTML Text editors often want to observe what’s being input and “fix it up” so that they can maintain a consistent WYSWIG UI.

# What is this _not_ useful for? #

The intent here isn't to be all things to all use-cases. Mutation Summary is not meant to:

  * **Use the DOM as some sort of state-transition machine.** It won't report transient states that the DOM moved through. It will only tell you what the difference is between the previous state and the present one.
  * **Observing complex selectors.** It offers support for a simple [subset of CSS selectors](docs/APIReference.md#supported-selector-syntax). Want to observe all elements that match `“div[foo] span.bar > p:first-child”`? Unfortunately, efficiently computing that is much harder and currently outside the scope of this library.

Note that both of the above use cases are possible given the data that the underlying Mutation Observers API provides -- we simply judged them to be outside the "80% use case" that we targeted with this particular library.

# Upgrading from 0.x to 1.x #

If you have been using a 0.x version of Mutation Summary and are upgrading to a 1.x version. There are breaking changes in the API. Most notable, the API has been converted to a module based packaging.

Please see the [Upgrade Guide](docs/Upgrading.md)

# Google groups discussion list #

 * [mutation-summary-discuss@googlegroups.com](https://groups.google.com/group/mutation-summary-discuss)

# Credits
Initial implementation contributed by:

Rafael Weinstein
https://github.com/rafaelw