import {MutationSummary} from "../src/MutationSummary";
import {IMutationSummaryOptions} from "../src/IMutationSummaryOptions";
import {IQuery} from "../src/IQuery";

import {assert} from "chai";

describe('MutationSummary Options Validation', () => {

  it('Throws on an unknown option', () => {
    // Unknown option.
    assert.throws(() => {
      new MutationSummary({
        blarg: true,
        callback: () => {
        },
        queries: [{all: true}]
      } as IMutationSummaryOptions);
    });
  });

  it('Throws if callback is missing', () => {
    // callback is required.
    assert.throws(() => {
      new MutationSummary({
        queries: [{all: true}]
      } as any as IMutationSummaryOptions);
    });
  });

  it('Throws if callback is not a function', () => {
    // callback must be a function.
    assert.throws(() => {
      new MutationSummary({
        callback: 'foo'
      } as any as IMutationSummaryOptions);
    });
  });

  it('Throws if queries is missing', () => {
    // queries is required.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
      } as any as IMutationSummaryOptions);
    });
  });

  it('Throws if queries is empty', () => {
    // queries must contain at least one query request.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: []
      });
    });
  });

  it('Accepts minimal required options', () => {
    // Valid all request.
    new MutationSummary({
      callback: () => {
      },
      queries: [{all: true}]
    });
  });

  it('Throws on a query with all set to true and any other attributes', () => {
    // all doesn't allow options.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{all: true, foo: false} as IQuery]
      });
    });
  });

  it('Validates a query with attributes', () => {
    // Valid attribute request.
    new MutationSummary({
      callback: () => {
      },
      queries: [{attribute: "foo"}]
    });
  });

  it('Throws if a query is provided with an attribute and options', () => {
    // attribute doesn't allow options.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{attribute: "foo", bar: false} as IQuery]
      });
    });
  });

  it('Throws if a query has an attribute that is not a string', () => {
    // attribute must be a string.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{attribute: 1} as any as IQuery]
      });
    });
  });

  it('Throws if a trimmed query attribute is empty', () => {
    // attribute must be non-zero length.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{attribute: '  '}]
      });
    });
  });

  it('Throws on an invalid attribute name in a query', () => {
    // attribute must names must be valid.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{attribute: '1foo'}]
      });
    });
  });

  it('Throws if a query has an attribute with multiple names', () => {
    // attribute must contain only one attribute.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{attribute: 'foo bar'}]
      });
    });
  });

  it('Accepts a query with an element name', () => {
    // Valid element request.
    new MutationSummary({
      callback: () => {
      },
      queries: [{element: 'div'}]
    });
  });

  it('Accepts an element with a proper selector', () => {
    // Valid element request 2.
    new MutationSummary({
      callback: () => {
      },
      queries: [{element: 'div, span[foo]'}]
    });
  });

  it('Accepts a query with valid element and elementAttributes', () => {
    // Valid element request 3.
    new MutationSummary({
      callback: () => {
      },
      queries: [{element: 'div', elementAttributes: "foo bar"}]
    });
  });

  it('Validates a complex element selector', () => {
    // Valid element request 4.
    new MutationSummary({
      callback: () => {
      },
      oldPreviousSibling: true,
      queries: [{element: 'div, span[foo]'}]
    });
  });

  it('Throws if a descendant selector is used in the element query', () => {
    // elementFilter doesn't support descendant selectors.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'div span[foo]'}]
      });
    });
  });

  it('Throws if the element filter is empty', () => {
    // elementFilter must contain at least one item
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: ''}]
      });
    });
  });

  it('Throws if a query has an invalid element filter', () => {
    // Invalid element syntax.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'div[noTrailingBracket',}]
      });
    });
  });

  it('Throws if a query with an element filter has an invalid option', () => {
    // Invalid element option
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'div[foo]', foo: true} as IQuery]
      });
    });
  });

  it('Throws for a query with an invalid elementAttributes value', () => {
    // elementAttribute must contain valid attribute names
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'div[foo]', elementAttributes: 'foo 1bar'}]
      });
    });
  });

  it('Throws for a query with an element filter and invalid additional options', () => {
    // Invalid element option 2.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'div[foo]', elementAttributes: 'foo', foo: true} as IQuery]
      });
    });
  });

  it('Throws for an invalid character data query', () => {
    // Valid characterData request.
    new MutationSummary({
      callback: () => {
      },
      queries: [{characterData: true}]
    });
  });

  it('Throws for a query with characterData and an invalid additional option', () => {
    // Invalid characterData option.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{characterData: true, foo: true} as IQuery]
      });
    });
  });

  it('Throws on a query with no data', () => {
    // Invalid query request.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{}]
      });
    });
  });

  it('Throws on a query with no valid options', () => {
    // Invalid query request.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{foo: true} as IQuery]
      });
    });
  });

  it('Throws if trying to listen to different cases of the same attribute', () => {
    // Disallow listening to multiple 'cases' of the same attribute.
    assert.throws(() => {
      new MutationSummary({
        callback: () => {
        },
        queries: [{element: 'a', elementAttributes: 'Bar bar'}]
      });
    });
  });
});
