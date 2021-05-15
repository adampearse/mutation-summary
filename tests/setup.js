// Copyright 2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

function assertSelectorNames(selectors, expectSelectorStrings) {
  assert.strictEqual(expectSelectorStrings.length, selectors.length);
  expectSelectorStrings.forEach(function(expectSelectorString, i) {
    assert.strictEqual(expectSelectorString, selectors[i].selectorString);
  });
}

suite('Setup', function() {
  test('Selector Parsing', function() {
    assertSelectorNames(
      Selector.parseSelectors('div'),
      ['div']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div '),
      ['div']
    );

    assertSelectorNames(
      Selector.parseSelectors('div,span'),
      ['div', 'span']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div , SPAN '),
      ['div', 'SPAN']
    );

    assert.throws(function() {
      Selector.parseSelectors('div span');
    });

    assert.throws(function() {
      Selector.parseSelectors('div > span');
    });

    assert.throws(function() {
      Selector.parseSelectors('div>span');
    });

    assert.throws(function() {
      Selector.parseSelectors('div < span');
    });

    assert.throws(function() {
      Selector.parseSelectors('div<span');
    });

    assert.throws(function() {
      Selector.parseSelectors('div:first-child')
    });

    assertSelectorNames(
      Selector.parseSelectors('#id'),
      ['*#id']
    );

    assertSelectorNames(
      Selector.parseSelectors('span#id'),
      ['span#id']
    );

    assertSelectorNames(
      Selector.parseSelectors('SPAN#id1#id2'),
      ['SPAN#id1#id2']
    );

    assertSelectorNames(
      Selector.parseSelectors('span, #id'),
      ['span', '*#id']
    );

    assert.throws(function() {
      Selector.parseSelectors('#2foo');
    });

    assert.throws(function() {
      Selector.parseSelectors('# div');
    });

    assertSelectorNames(
      Selector.parseSelectors('.className'),
      ['*.className']
    );

    assertSelectorNames(
      Selector.parseSelectors('.className.className2'),
      ['*.className.className2']
    );

    assertSelectorNames(
      Selector.parseSelectors('div.className'),
      ['div.className']
    );

    assertSelectorNames(
      Selector.parseSelectors('DIV.className.className2'),
      ['DIV.className.className2']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div.className '),
      ['div.className']
    );

    assertSelectorNames(
      Selector.parseSelectors('.className'),
      ['*.className']
    );

    assertSelectorNames(
      Selector.parseSelectors(' .className '),
      ['*.className']
    );

    assertSelectorNames(
      Selector.parseSelectors('.className,.className,span.className'),
      ['*.className', '*.className', 'span.className']
    );

    assertSelectorNames(
      Selector.parseSelectors(' .className, .className, SPAN.className'),
      ['*.className', '*.className', 'SPAN.className']
    );

    assert.throws(function() {
      Selector.parseSelectors('div. className');
    });

    assert.throws(function() {
      Selector.parseSelectors('div . className');
    });

    assert.throws(function() {
      Selector.parseSelectors('div .className');
    });

    assert.throws(function() {
      Selector.parseSelectors('div .className');
    });

    assert.throws(function() {
      Selector.parseSelectors('.2className');
    });

    assertSelectorNames(
      Selector.parseSelectors('div[foo].className'),
      ['div[foo].className']
    );

    assertSelectorNames(
      Selector.parseSelectors('DIV[foo].className#id'),
      ['DIV[foo].className#id']
    );

    assertSelectorNames(
      Selector.parseSelectors('div#id.className[foo]'),
      ['div#id.className[foo]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[foo]'),
      ['div[foo]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[ foo ]'),
      ['div[foo]']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div[ foo ] '),
      ['div[foo]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[foo],span[bar]'),
      ['div[foo]', 'span[bar]']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div[foo] , span[bar] '),
      ['div[foo]', 'span[bar]']
    );

    assertSelectorNames(
      Selector.parseSelectors('[foo]'),
      ['*[foo]']
    );

    assertSelectorNames(
      Selector.parseSelectors('[foo][bar]'),
      ['*[foo][bar]']
    );

    assert.throws(function() {
      Selector.parseSelectors('div [foo]');
    });

    assert.throws(function() {
      Selector.parseSelectors('div[foo');
    });

    assert.throws(function() {
      Selector.parseSelectors('divfoo]');
    });

    assertSelectorNames(
      Selector.parseSelectors('div[foo=bar]'),
      ['div[foo="bar"]']);

    assertSelectorNames(
      Selector.parseSelectors('div[ foo=" bar baz " ]'),
      ['div[foo=" bar baz "]']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div[ foo = \' bar baz \'] '),
      ['div[foo=" bar baz "]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[foo=baz],span[bar="bat"]'),
      ['div[foo="baz"]', 'span[bar="bat"]']
    );

    assertSelectorNames(
      Selector.parseSelectors(' div[foo=boo] , span[bar="baz"] '),
      ['div[foo="boo"]', 'span[bar="baz"]']
    );

    assert.throws(function() {
      Selector.parseSelectors('div[foo="bar ]');
    });

    assert.throws(function() {
      Selector.parseSelectors('div[foo=bar"baz]');
    });

    assert.throws(function() {
      Selector.parseSelectors('div[foo=bar baz]');
    });

    assert.throws(function() {
      Selector.parseSelectors('div[foo|=bar]');
    });

    assertSelectorNames(
      Selector.parseSelectors('div[foo~=bar]'),
      ['div[foo~="bar"]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[foo~="bar  "]'),
      ['div[foo~="bar  "]']
    );

    assert.throws(function() {
      Selector.parseSelectors('div[foo~=]');
    });

    assert.throws(function() {
      Selector.parseSelectors('div[foo~ =bar]');
    });

    assertSelectorNames(
      Selector.parseSelectors('div[foo][bar]'),
      ['div[foo][bar]']
    );

    assertSelectorNames(
      Selector.parseSelectors('div[foo], A, *[bar], div[ baz = "bat"]'),
      ['div[foo]', 'A', '*[bar]', 'div[baz="bat"]']
    );
  });


  test('Options Validation', function() {
    // Unknown option.
    assert.throws(function() {
      new MutationSummary({
        blarg: true,
        callback: function() {},
        queries: [{ all: true }]
      });
    });

    // callback is required.
    assert.throws(function() {
      new MutationSummary({
        queries: [{ all: true }]
      });
    });

    // callback must be a function.
    assert.throws(function() {
      new MutationSummary({
        callback: 'foo'
      });
    });

    // queries is required.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
      });
    });

    // queries must contain at least one query request.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: []
      });
    });

    // Valid all request.
    new MutationSummary({
      callback: function() {},
      queries: [{ all: true }]
    });

    // all doesn't allow options.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ all: true, foo: false }]
      });
    });

    // Valid attribute request.
    new MutationSummary({
      callback: function() {},
      queries: [{ attribute: "foo" }]
    });

    // attribute doesn't allow options.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ attribute: "foo", bar: false }]
      });
    });

    // attribute must be a string.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ attribute: 1 }]
      });
    });

    // attribute must be non-zero length.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ attribute: '  ' }]
      });
    });

    // attribute must names must be valid.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ attribute: '1foo' }]
      });
    });

    // attribute must contain only one attribute.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ attribute: 'foo bar' }]
      });
    });

    // Valid element request.
    new MutationSummary({
      callback: function() {},
      queries: [{ element: 'div' }]
    });

    // Valid element request 2.
    new MutationSummary({
      callback: function() {},
      queries: [{ element: 'div, span[foo]' }]
    });

    // Valid element request 3.
    new MutationSummary({
      callback: function() {},
      queries: [{ element: 'div', elementAttributes: "foo bar" }]
    });

    // Valid element request 4.
    new MutationSummary({
      callback: function() {},
      oldPreviousSibling: true,
      queries: [{ element: 'div, span[foo]' }]
    });

    // elementFilter doesn't support descendant selectors.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'div span[foo]' }]
      });
    });

    // elementFilter must contain at least one item
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: '' }]
      });
    });

    // Invalid element syntanx.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'div[noTrailingBracket', }]
      });
    });

    // Invalid element option
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'div[foo]', foo: true }]
      });
    });

    // elememtAttribute must contain valid attribute names
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'div[foo]', elementAttributes: 'foo 1bar' }]
      });
    });

    // Invalid element option 2.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'div[foo]', elementAttributes: 'foo', foo: true }]
      });
    });

    // Valid characterData request.
    new MutationSummary({
      callback: function() {},
      queries: [{ characterData: true }]
    });

    // Invalid characterData option.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ characterData: true, foo: true }]
      });
    });

    // Invalid query request.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{  }]
      });
    });

    // Invalid query request.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ foo: true  }]
      });
    });

    // Disallow listening to multiple 'cases' of the same attribute.
    assert.throws(function() {
      new MutationSummary({
        callback: function() {},
        queries: [{ element: 'a', elementAttributes: 'Bar bar' }]
      });
    });
  });
});
