import {Selector} from "../src/Selector";
import {assert} from "chai";

function assertSelectorNames(selectors, expectSelectorStrings) {
  assert.strictEqual(expectSelectorStrings.length, selectors.length);
  expectSelectorStrings.forEach(function(expectSelectorString, i) {
    assert.strictEqual(expectSelectorString, selectors[i].selectorString);
  });
}

describe('Selector', function() {
  
  it('Single tag parses correctly', () => {
    assertSelectorNames(
        Selector.parseSelectors('div'),
        ['div']
    );
  });

  it('Strip whitespace', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div '),
        ['div']
    );
  });

  it('Comma separated tags', () => {
    assertSelectorNames(
        Selector.parseSelectors('div,span'),
        ['div', 'span']
    );
  });

  it('Case sensitive', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div , SPAN '),
        ['div', 'SPAN']
    );
  });

  it('Throws for space separated tags', () => {
    assert.throws(() => {
      Selector.parseSelectors('div span');
    });
  });

  it('Throws for tags separated with " > "', () => {
    assert.throws(() => {
      Selector.parseSelectors('div > span');
    });
  });

  it('Throws for tags separated with ">"', () => {
    assert.throws(() => {
      Selector.parseSelectors('div>span');
    });
  });

  it('Throws for tags separated with " < "', () => {
    assert.throws(() => {
      Selector.parseSelectors('div < span');
    });
  });

  it('Throws for tags separated with "<"', () => {
    assert.throws(() => {
      Selector.parseSelectors('div<span');
    });
  });

  it('Throws for selectors with :', () => {
    assert.throws(() => {
      Selector.parseSelectors('div:first-child')
    });
  });

  it('Parses an id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('#id'),
        ['*#id']
    );
  });

  it('Parses a tag and id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('span#id'),
        ['span#id']
    );
  });

  it('Correctly parses a selector with multiple hash symbols.', () => {
    assertSelectorNames(
        Selector.parseSelectors('SPAN#id1#id2'),
        ['SPAN#id1#id2']
    );
  });

  it('Correctly parses a tag followed by an id selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('span, #id'),
        ['span', '*#id']
    );
  });

  it('Throws on an invalid id selector', () => {
    assert.throws(() => {
      Selector.parseSelectors('#2foo');
    });
  });

  it('Throws on a hash followed by a tag', () => {
    assert.throws(() => {
      Selector.parseSelectors('# div');
    });
  });

  it('Parses a single classname.', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className'),
        ['*.className']
    );
  });

  it('Parses multiple classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className.className2'),
        ['*.className.className2']
    );
  });

  it('Parses a tag and classname', () => {
    assertSelectorNames(
        Selector.parseSelectors('div.className'),
        ['div.className']
    );
  });

  it('Parses an upper case tag with two classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('DIV.className.className2'),
        ['DIV.className.className2']
    );
  });

  it('Parses a tag and class name with whitespace around them', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div.className '),
        ['div.className']
    );
  });


  it('Parses a classname surrounded by whitespace', () => {
    assertSelectorNames(
        Selector.parseSelectors(' .className '),
        ['*.className']
    );
  });

  it('Parses comma separated classnames', () => {
    assertSelectorNames(
        Selector.parseSelectors('.className,.className,span.className'),
        ['*.className', '*.className', 'span.className']
    );
  });

  it('Keeps case intact in tag and classname.', () => {
    assertSelectorNames(
        Selector.parseSelectors(' .className, .className, SPAN.className'),
        ['*.className', '*.className', 'SPAN.className']
    );
  });

  it('Throws on a classname with a space before the .', () => {
    assert.throws(() => {
      Selector.parseSelectors('div. className');
    });
  });

  it('Throws on whitespace around the . in a classname', () => {
    assert.throws(() => {
      Selector.parseSelectors('div . className');
    });
  });

  it('Throws with a space between the tag and classname selector', () => {
    assert.throws(() => {
      Selector.parseSelectors('div .className');
    });
  });

  it('Throws on classname starting with a digit', () => {
    assert.throws(() => {
      Selector.parseSelectors('.2className');
    });
  });

  it('Parses an attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo].className'),
        ['div[foo].className']
    );
  });

  it('Preserves tag case when parsing attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('DIV[foo].className#id'),
        ['DIV[foo].className#id']
    );
  });

  it('Parses tag, id, classname, and attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div#id.className[foo]'),
        ['div#id.className[foo]']
    );
  });

  it('Parses simple attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo]'),
        ['div[foo]']
    );
  });

  it('Handles whitespace in attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[ foo ]'),
        ['div[foo]']
    );
  });

  it('Handles white space around tag and attribute', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[ foo ] '),
        ['div[foo]']
    );
  });

  it('Parses multiple tags with attributes', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo],span[bar]'),
        ['div[foo]', 'span[bar]']
    );

  });

  it('Handles whitespace between tags with attributes', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[foo] , span[bar] '),
        ['div[foo]', 'span[bar]']
    );
  });

  it('Handles attribute without tag', () => {
    assertSelectorNames(
        Selector.parseSelectors('[foo]'),
        ['*[foo]']
    );
  });

  it('Parses multiple attributes with no tag', () => {
    assertSelectorNames(
        Selector.parseSelectors('[foo][bar]'),
        ['*[foo][bar]']
    );
  });

  it('Throws if white space between tag and attribute', () => {
    assert.throws(() => {
      Selector.parseSelectors('div [foo]');
    });
  });

  it('Throws when missing closing attribute bracket', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo');
    });
  });

  it('Throws when missing opening attribute bracket', () => {
    assert.throws(() => {
      Selector.parseSelectors('divfoo]');
    });
  });

  it('Parses attribute with value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo=bar]'),
        ['div[foo="bar"]']);
  });

  it('Parses attribute with quoted value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[ foo=" bar baz " ]'),
        ['div[foo=" bar baz "]']
    );
  });

  it('Parses attribute with escaped quotes in value', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[ foo = \' bar baz \'] '),
        ['div[foo=" bar baz "]']
    );
  });

  it('Parses multiple attribute value pairs', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo=baz],span[bar="bat"]'),
        ['div[foo="baz"]', 'span[bar="bat"]']
    );
  });

  it('Parses whitespace between tags with attributes and values', () => {
    assertSelectorNames(
        Selector.parseSelectors(' div[foo=boo] , span[bar="baz"] '),
        ['div[foo="boo"]', 'span[bar="baz"]']
    );
  });

  it('Throws with non-terminated attribute value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo="bar ]');
    });
  });

  it('Throws with quote in attribute value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo=bar"baz]');
    });
  });

  it('Throws with attribute value with whitespace', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo=bar baz]');
    });
  });

  it('Throws with invalid attribute with a pipe in name', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo|=bar]');
    });
  });

  it('Throws with invalid attribute with a tilde in name', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo~=bar]'),
        ['div[foo~="bar"]']
    );
  });

  it('Throws with invalid attribute name and value', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo~="bar  "]'),
        ['div[foo~="bar  "]']
    );
  });

  it('Throws with invalid attribute name with no value', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo~=]');
    });
  });

  it('Throws with invalid attribute name with tilde and whitespace', () => {
    assert.throws(() => {
      Selector.parseSelectors('div[foo~ =bar]');
    });
  });

  it('Parses multiple attributes with no values', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo][bar]'),
        ['div[foo][bar]']
    );
  });

  it('Parses complex selector', () => {
    assertSelectorNames(
        Selector.parseSelectors('div[foo], A, *[bar], div[ baz = "bat"]'),
        ['div[foo]', 'A', '*[bar]', 'div[baz="bat"]']
    );
  });
});