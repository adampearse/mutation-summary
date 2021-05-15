
// @ts-ignore
import globalJsdom from "global-jsdom";

import {Selector} from "../src/Selector";
import {assert} from "chai";

function assertSelectorNames(selectors, expectSelectorStrings) {
  assert.strictEqual(expectSelectorStrings.length, selectors.length);
  expectSelectorStrings.forEach(function(expectSelectorString, i) {
    assert.strictEqual(expectSelectorString, selectors[i].selectorString);
  });
}


suite('Selector', function() {
  let dom: () => void;

  setup(function () {
    dom = globalJsdom(`<html><body><div id="test-div"></div></body></html>`);
  });

  teardown(function () {
    dom();
  });

  test('Single tag parses correctly', () => {
    assertSelectorNames(
        Selector.parseSelectors('div'),
        ['div']
    );
  });

  test('Strip whitespace', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div '),
        ['div']
    );
  });

  test('Comma separated tags', () => {
    assertSelectorNames(
        Selector.parseSelectors('div,span'),
        ['div', 'span']
    );
  });

  test('Case sensitive', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div , SPAN '),
        ['div', 'SPAN']
    );
  });

  test('Throws for space separated tags', () => {
    assert.throws(() => {
      Selector.parseSelectors('div span');
    });
  });

  test('Throws for tags separated with " > "', () => {
    assert.throws(() => {
      Selector.parseSelectors('div > span');
    });
  });

  test('Throws for tags separated with ">"', () => {
    assert.throws(() => {
      Selector.parseSelectors('div>span');
    });
  });

  test('Throws for tags separated with " < "', () => {
    assert.throws(() => {
      Selector.parseSelectors('div < span');
    });
  });

  test('Throws for tags separated with "<"', () => {
    assert.throws(() => {
      Selector.parseSelectors('div<span');
    });
  });

  test('Throws for selectors with :', () => {
    assert.throws(() => {
      Selector.parseSelectors('div:first-child')
    });
  });

  test('Parses an id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('#id'),
        ['*#id']
    );
  });

  test('Parses a tag and id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('span#id'),
        ['span#id']
    );
  });

  test('Correctly parses a selector with multiple hash symbols.', () => {
    assertSelectorNames(
        Selector.parseSelectors('SPAN#id1#id2'),
        ['SPAN#id1#id2']
    );
  });

  test('Correctly parses a tag followed by an id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('span, #id'),
        ['span', '*#id']
    );
  });

  test('Throws on an invalid id selector', () => {
    assert.throws(() => {
      Selector.parseSelectors('#2foo');
    });
  });

  test('Throws on a hash followed by a tag', () => {
    assert.throws(() => {
      Selector.parseSelectors('# div');
    });
  });

  test('Parses a single classname.', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className'),
        ['*.className']
    );
  });

  test('Parses multiple classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className.className2'),
        ['*.className.className2']
    );
  });

  test('Parses a tag and classname', () => {
    assertSelectorNames(
        Selector.parseSelectors('div.className'),
        ['div.className']
    );
  });

  test('Parses an upper case tag with two classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('DIV.className.className2'),
        ['DIV.className.className2']
    );
  });

  test('Parses a tag and class name with whitespace around them', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div.className '),
        ['div.className']
    );
  });


  test('Parses a classname surrounded by whitespace', () => {
    assertSelectorNames(
        Selector.parseSelectors(' .className '),
        ['*.className']
    );
  });

  test('Parses comma separated classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className,.className,span.className'),
        ['*.className', '*.className', 'span.className']
    );
  });

  test('Keeps case intact in tag and classname.', () => {
    assertSelectorNames(
        Selector.parseSelectors(' .className, .className, SPAN.className'),
        ['*.className', '*.className', 'SPAN.className']
    );
  });

  test('Throws on a classname with a space before the .', () => {
    assert.throws(() => {
      Selector.parseSelectors('div. className');
    });
  });

  test('Throws on whitespace around the . in a classname', () => {
    assert.throws(() => {
      Selector.parseSelectors('div . className');
    });
  });

  test('Throws with a space between the tag and classname selector', () => {
    assert.throws(() => {
      Selector.parseSelectors('div .className');
    });
  });

  test('Throws on classname starting with a digit', () => {
    assert.throws(() => {
      Selector.parseSelectors('.2className');
    });
  });

  test('Parses an attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo].className'),
        ['div[foo].className']
    );
  });

  test('Preserves tag case when parsing attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('DIV[foo].className#id'),
        ['DIV[foo].className#id']
    );
  });

  test('Parses tag, id, classname, and attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div#id.className[foo]'),
        ['div#id.className[foo]']
    );
  });

  test('Parses simple attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo]'),
        ['div[foo]']
    );
  });

  test('Handles whitespace in attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[ foo ]'),
        ['div[foo]']
    );
  });

  test('Handles white space around tag and attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[ foo ] '),
        ['div[foo]']
    );
  });

  test('Parses multiple tags with attributes', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo],span[bar]'),
        ['div[foo]', 'span[bar]']
    );

  });

  test('Handles whitespace between tags with attributes', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[foo] , span[bar] '),
        ['div[foo]', 'span[bar]']
    );
  });

  test('Handles attribute without tag', () => {
    assertSelectorNames(
        Selector.parseSelectors('[foo]'),
        ['*[foo]']
    );
  });

  test('Parses multiple attributes with no tag', () => {
    assertSelectorNames(
        Selector.parseSelectors('[foo][bar]'),
        ['*[foo][bar]']
    );
  });

  test('Throws if white space between tag and attribute', () => {
    assert.throws(() => {
      Selector.parseSelectors('div [foo]');
    });
  });

  test('Throws when missing closing attribute bracket', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo');
    });
  });

  test('Throws when missing opening attribute bracket', () => {
    assert.throws(() => {
      Selector.parseSelectors('divfoo]');
    });
  });

  test('Parses attribute with value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo=bar]'),
        ['div[foo="bar"]']);
  });

  test('Parses attribute with quoted value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[ foo=" bar baz " ]'),
        ['div[foo=" bar baz "]']
    );
  });

  test('Parses attribute with escaped quotes in value', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[ foo = \' bar baz \'] '),
        ['div[foo=" bar baz "]']
    );
  });

  test('Parses multiple attribute value pairs', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo=baz],span[bar="bat"]'),
        ['div[foo="baz"]', 'span[bar="bat"]']
    );
  });

  test('Parses whitespace between tags with attributes and values', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[foo=boo] , span[bar="baz"] '),
        ['div[foo="boo"]', 'span[bar="baz"]']
    );
  });

  test('Throws with non-terminated attribute value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo="bar ]');
    });
  });

  test('Throws with quote in attribute value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo=bar"baz]');
    });
  });

  test('Throws with attribute value with whitespace', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo=bar baz]');
    });
  });

  test('Throws with invalid attribute with a pipe in name', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo|=bar]');
    });
  });

  test('Throws with invalid attribute with a tilde in name', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo~=bar]'),
        ['div[foo~="bar"]']
    );
  });

  test('Throws with invalid attribute name and value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo~="bar  "]'),
        ['div[foo~="bar  "]']
    );
  });

  test('Throws with invalid attribute name with no value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo~=]');
    });
  });

  test('Throws with invalid attribute name with tilde and whitespace', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo~ =bar]');
    });
  });

  test('Parses multiple attributes with no values', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo][bar]'),
        ['div[foo][bar]']
    );
  });

  test('Parses complex selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo], A, *[bar], div[ baz = "bat"]'),
        ['div[foo]', 'A', '*[bar]', 'div[baz="bat"]']
    );
  });
});