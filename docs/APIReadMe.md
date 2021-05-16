# Introduction
This is the API documentation for the [Mutation Summary](https://github.com/mmacfadden/mutation-summary/) library. Mutation Summary is a JavaScript library that makes observing changes to the DOM fast, easy and safe. It is built on top of (and requires) a new API called [DOM Mutation Observers](http://dom.spec.whatwg.org/#mutation-observers).

# Basic Usage
The main class is the [MutationSummary](classes/mutationsummary.html) class. To use the library construct a new [MutationSummary](classes/mutationsummary.html) passing it options telling it where and what to listen to, and how to notify you of changes.

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

# Queries
Queries determine which elements and changes are observed and reported on. There are four types of Query objects:

* **[attribute](#attribute-query)**
* **[element](#element-query)**
* **[characterData](#character-data-query)**
* **[all](#all-query)**

## Attribute Query
Summarize changes to the presence and value of the given attribute throughout the observed subtree.

### Query Format
```typescript
{
  /**
   * The name of a single attribute to observe throughout the subtree.
   */
  attribute: string 
}
```

### Summary Format
```typescript
{
  /**
   * All elements presently in the subtree and having the given attribute,
   * but that were not in the subtree, lacked the given attribute or both.
   */
  added: Node[]

  /**
   * All elements previously in the subtree and having the given attribute,
   * but that now are not in the subtree, lack the given attribute or both.
   */
  removed: Node[]

  /**
   * All elements previously and presently in the subtree and previously and
   * presently having the given attribute, for whom the value of the given
   * attribute change.
   */
  valueChanged: Node[]
}
```

## Element Query
Summarize the changes to the presence and location of the elements matching the given selector string, and (optionally) changes to the given set of attribute _of those elements_ throughout the observed subtree.

### Query Format
```typescript
{
  /**
   * A “selector” string which describes what elements are to be observed.
   */
  element: string
  
  /**
   * A space separated list of attributes to observe for value changes
   * on the specified element.
   */
  elementAttributes?: string
}
```

### Summary Format
```typescript
{
  /**
   * All elements are presently in the subtree and match at least one
   * pattern, but previously were not in the subtree, now match zero
   * patterns or both.
   */
  added: Node[]

  /**
   * All elements were previously in the subtree and matched at least one
   * pattern, but which now are not in the subtree, new match zero patterns
   * or both.
   */
  removed: Node[]
  
  /**
   * All elements previously & presently in the subtree and previously &
   * presently matching at least one pattern, which were moved to be 
   * children of a new parent (their present parentNode is distinct from
   * the previous parentNode). 
   */
  reparented: Node[]

  /**
   * An object reporting attribute value changes. The object contains one key
   * for each attribute name contained in `elementAttributes`. The value of
   * each key is an array of elements previously & presently in the subtree
   * and previously & presently matching at least one pattern for whom the
   * corresponding attribute changed value. Only present if elementAttributes
   * was specified
   */
  attributeChanged: {
    attributeName1: Node[]
    attributeName2: Node[]
    ...
  }
}
```

## Character Data Query
Summarize the effective changes to the presence and value of characterData nodes in the observed subtree.

### Query Format
```typescript
{
  /**
   * Indicates to observe to characterData nodes.
   */
  characterData: true 
}
```

### Summary Format
```typescript
{
  /**
   * All character data nodes presently in the subtree, but previously 
   * were not in the subtree.
   */
  added: Node[]

  /**
   * All character data nodes previously in the subtree, which now are
   * not in the subtree.
   */
  removed: Node[]

  /**
   * All character data nodes previously & presently in the subtree,
   * which were moved to be children of a new parent (their present 
   * parentNode is distinct from the previous parentNode).
   */
  reparented: Node[]

  /**
   * All character data nodes previously & presently whose value changed.
   */
  valueChanged: Node[]
}
```

## All Query
Observes all changes to a given subtree.

### Query Format
```typescript
{
  /**
   * Indicates that all modifications to the subtree should be
   * observed.
   */
  all: true 
}
```

### Summary Format
```typescript
{
  /**
   * All nodes presently in the subtree, but previously were not in the
   * subtree.
   */
  added: Node[]

  /**
   * All nodes previously in the subtree, which now are not in the subtree.
   */
  removed: Node[]
  
  /**
   * All nodes previously & presently in the subtree, which were moved to be
   * children of a new parent (their present parentNode is distinct from the
   * previous parentNode).
   */
  reparented: Node[]

  /**
   * All nodes previously & presently in the subtree and previously &
   * presently are children of the same parent, but have moved to a new
   * location in their parentNode’s childList.
   */
  reorderd: Node[]

  /**
   * An object reporting attribute value changes. The object contains one key
   * for each attribute name contained in `elementAttributes`. The value of
   * each key is an array of elements previously & presently in the subtree
   * and previously & presently matching at least one pattern for whom the
   * corresponding attribute changed value. Only present if 
   * elementAttributes specified
   */
  attributeChanged: {
    attributeName1: Node[]
    attributeName2: Node[]
  ...
  }

  /**
   * All characterData nodes previously & presently whose value changed.
   */
  characterDataChanged: Node[]
}
```