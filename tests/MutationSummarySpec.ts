import {MutationSummary} from "../src/MutationSummary";
import {IQuery} from "../src/IQuery";
import {IMutationSummaryOptions} from "../src/IMutationSummaryOptions";
import {Summary} from "../src/Summary";
import {TreeMirror} from "../src/tree-mirror/TreeMirror";
import {TreeMirrorClient} from "../src/tree-mirror/TreeMirrorClient";

import {registerValidator, compareNodeArrayIgnoreOrder} from "./test-validator";
import {assert} from "chai";

registerValidator();

describe('Mutation Summary', function () {

  let testDiv: HTMLElement;
  let observer: MutationSummary;
  let observing: boolean;
  let query: IQuery;
  let options: IMutationSummaryOptions;

  beforeEach(function () {
    testDiv = document.createElement('div');
    testDiv.id = 'test-div';

    testDiv['__id__'] = 1;
  });

  afterEach(function () {
    stopObserving();
    testDiv.textContent = '';
  });

  function startObserving(q?: IQuery, extraOptions?: any) {
    query = q || {all: true};
    options = {
      rootNode: testDiv,
      callback: function () {
        throw 'Mutation Delivered at end of microtask'
      },
      queries: [query]
    }

    if (extraOptions) {
      Object.keys(extraOptions).forEach(function (key) {
        options[key] = extraOptions[key];
      });
    }

    observer = new MutationSummary(options);

    observing = true;
  }

  function stopObserving() {
    if (observing)
      observer.disconnect();

    observing = false;
  }

  function assertSummary(expect: any, opt_summaries?: Summary[]) {
    const changed: Summary = opt_summaries ? opt_summaries[0] : observer.takeSummaries()[0];

    expect.added = expect.added || [];
    expect.removed = expect.removed || [];
    expect.reparented = expect.reparented || [];
    expect.reordered = expect.reordered || [];
    expect.attributeChanged = expect.attributeChanged || {};

    // added, removed
    assert(typeof expect.added == typeof changed.added && typeof expect.removed == typeof changed.removed);
    compareNodeArrayIgnoreOrder(expect.added, changed.added);
    compareNodeArrayIgnoreOrder(expect.removed, changed.removed);

    if (options.oldPreviousSibling) {
      expect.removed.forEach(function (node: Node, index: number) {
        assert.strictEqual(expect.removedOldPreviousSibling[index], changed.getOldPreviousSibling(node));
      });
    }

    // reparented
    if (query.all || query.element || query.characterData) {
      assert(typeof expect.reparented === typeof changed.reparented);
      compareNodeArrayIgnoreOrder(expect.reparented, changed.reparented);

      if (options.oldPreviousSibling) {
        expect.reparented.forEach(function (node: Node, index: number) {
          assert.strictEqual(expect.reparentedOldPreviousSibling[index], changed.getOldPreviousSibling(node));
        });
      }
    } else {
      assert.isUndefined(changed.reparented);
    }

    // reordered
    if (query.all) {
      assert(typeof expect.reordered == typeof changed.reordered);
      compareNodeArrayIgnoreOrder(expect.reordered, changed.reordered);

      expect.reordered.forEach(function (node: Node, index: number) {
        assert.strictEqual(expect.reorderedOldPreviousSibling[index], changed.getOldPreviousSibling(node));
      });
    } else {
      assert.isUndefined(changed.reordered);
    }

    // valueChanged
    if (query.attribute || query.characterData) {
      assert(typeof expect.valueChanged == typeof changed.valueChanged);
      compareNodeArrayIgnoreOrder(expect.valueChanged, changed.valueChanged);
      const getOldFunction = query.attribute ? 'getOldAttribute' : 'getOldCharacterData';

      expect.valueChanged.forEach(function (node: Node, index: number) {
        assert.strictEqual(expect.oldValues[index], changed[getOldFunction](node, query.attribute));
      });
    } else {
      assert.isUndefined(changed.valueChanged);
    }

    // attributeChanged
    if (query.all || query.elementAttributes) {
      assert(typeof expect.attributeChanged == typeof changed.attributeChanged);
      assert.strictEqual(Object.keys(expect.attributeChanged).length, Object.keys(changed.attributeChanged).length);

      Object.keys(expect.attributeChanged).forEach(function (attrName) {
        compareNodeArrayIgnoreOrder(expect.attributeChanged[attrName], changed.attributeChanged[attrName]);
        expect.attributeOldValue[attrName].forEach(function (attrOldValue: string, index: number) {
          assert.strictEqual(expect.attributeOldValue[attrName][index], changed.getOldAttribute(expect.attributeChanged[attrName][index], attrName));
        });
      });
    } else {
      assert.isUndefined(changed.attributeChanged);
    }
  }

  function assertNothingReported() {
    assert.isUndefined(observer.takeSummaries());
  }


  it('Disconnect and Reconnect', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', '1');

    startObserving({
      element: 'div',
      elementAttributes: 'foo bar'
    });

    div.setAttribute('foo', '2');

    const summaries = observer.disconnect();
    div.setAttribute('bar', '3'); // should be ignored.
    observer.reconnect();

    // summaries returned from disconnect are handed in.
    assertSummary({
      attributeChanged: {'foo': [div], 'bar': []},
      attributeOldValue: {'foo': ['1'], 'bar': []}
    }, summaries);

    div.setAttribute('foo', '3');
    // change to 'bar' should never be reported.
    assertSummary({
      attributeChanged: {'foo': [div], 'bar': []},
      attributeOldValue: {'foo': ['2'], 'bar': []}
    });
  });

  it('Attribute Basic', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', 'bar');

    const div2 = document.createElement('div');
    testDiv.appendChild(div2);

    const div3 = document.createElement('div');
    div3.setAttribute('foo', 'bat');

    startObserving({
      attribute: "foo"
    });

    div.setAttribute('foo', 'bar2');
    div2.setAttribute('foo', 'baz');
    testDiv.appendChild(div3);
    div3.setAttribute('foo', 'bat2');
    assertSummary({
      added: [div2, div3],
      valueChanged: [div],
      oldValues: ['bar']
    });

    div3.setAttribute('foo', 'bat3');
    testDiv.removeChild(div3);
    testDiv.removeChild(div);
    div2.setAttribute('foo', 'baz2');
    assertSummary({
      added: [],
      removed: [div3, div],
      valueChanged: [div2],
      oldValues: ['baz']
    });

    div2.removeAttribute('foo');
    div2.setAttribute('foo', 'baz2');
    assertNothingReported();
  });

  it('Attribute -- Array proto changed', function () {
    (Array.prototype as any).foo = 'bar';

    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', 'bar');

    const div2 = document.createElement('div');
    testDiv.appendChild(div2);

    const div3 = document.createElement('div');
    div3.setAttribute('foo', 'bat');

    startObserving({
      attribute: "foo"
    });

    div.setAttribute('foo', 'bar2');
    div2.setAttribute('foo', 'baz');
    testDiv.appendChild(div3);
    div3.setAttribute('foo', 'bat2');
    assertSummary({
      added: [div2, div3],
      valueChanged: [div],
      oldValues: ['bar']
    });

    div3.setAttribute('foo', 'bat3');
    testDiv.removeChild(div3);
    testDiv.removeChild(div);
    div2.setAttribute('foo', 'baz2');
    assertSummary({
      added: [],
      removed: [div3, div],
      valueChanged: [div2],
      oldValues: ['baz']
    });

    div2.removeAttribute('foo');
    div2.setAttribute('foo', 'baz2');
    assertNothingReported();
    delete (Array.prototype as any).foo;
  });

  it('Attribute Case Insensitive', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', 'bar');

    const div2 = document.createElement('div');
    testDiv.appendChild(div2);

    const div3 = document.createElement('div');
    div3.setAttribute('foo', 'bat');

    startObserving({
      attribute: "FOO"
    });

    div.setAttribute('foo', 'bar2');
    div2.setAttribute('foo', 'baz');
    testDiv.appendChild(div3);
    div3.setAttribute('foo', 'bat2');
    assertSummary({
      added: [div2, div3],
      valueChanged: [div],
      oldValues: ['bar']
    });

    div3.setAttribute('foo', 'bat3');
    testDiv.removeChild(div3);
    testDiv.removeChild(div);
    div2.setAttribute('foo', 'baz2');
    assertSummary({
      added: [],
      removed: [div3, div],
      valueChanged: [div2],
      oldValues: ['baz']
    });

    div2.removeAttribute('foo');
    div2.setAttribute('foo', 'baz2');
    assertNothingReported();
  });

  it('CharacterData Basic', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.innerHTML = 'foo';
    const text = div.firstChild;
    const comment = document.createComment('123');
    div.appendChild(comment);

    startObserving({
      characterData: true
    });
    text.textContent = 'bar';
    comment.textContent = '456'
    const comment2 = div.appendChild(document.createComment('456'));
    comment2.textContent = '789';
    const div2 = testDiv.appendChild(document.createElement('div'));
    assertSummary({
      added: [comment2],
      reparented: [],
      valueChanged: [text, comment],
      oldValues: ['foo', '123']
    });

    text.textContent = 'baz';
    text.textContent = 'bat';
    div.removeChild(comment2);
    assertSummary({
      removed: [comment2],
      reparented: [],
      valueChanged: [text],
      oldValues: ['bar']
    });

    text.textContent = 'bar';
    text.textContent = 'bat'; // Restoring its original value should mean
    // we won't hear about the change.
    assertNothingReported();

    div2.appendChild(text);
    assertSummary({
      reparented: [text],
      valueChanged: [],
      oldValues: []
    });
  });

  it('Element Basic', function () {
    startObserving({
      element: 'div, A, p'
    });

    const div = testDiv.appendChild(document.createElement('div'));
    div.appendChild(document.createElement('span'));
    const p = testDiv.appendChild(document.createElement('P'));
    assertSummary({
      added: [div, p]
    });

    testDiv.removeChild(div);
    testDiv.appendChild(div);
    assertNothingReported();
  });

  it('Element Attribute Specified', function () {
    startObserving({
      element: 'div[foo], A, *[bar], div[ baz = "bat"], span#foo[blow~=blarg]'
    });

    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', 'foo');
    const div2 = document.createElement('div');
    testDiv.appendChild(div2);
    div2.setAttribute('fooz', 'foo');
    const div3 = document.createElement('div');
    testDiv.appendChild(div3);
    div3.setAttribute('baz', 'fat');

    const span = document.createElement('span');
    div.appendChild(span);
    const p = document.createElement('P');
    testDiv.appendChild(p);
    p.setAttribute('baz', 'baz');
    assertSummary({
      added: [div]
    });

    div.removeAttribute('foo');
    p.removeAttribute('baz');
    p.setAttribute('bar', 'bar');
    div3.setAttribute('baz', 'bat');
    span.id = 'foo';
    span.setAttribute('blow', 'blarg bloog');
    assertSummary({
      added: [p, div3, span],
      removed: [div]
    });

    div3.removeAttribute('baz');
    div3.setAttribute('baz', 'bat');
    assertNothingReported();
  });

  it('Case Insensitive Element Attributes', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);

    startObserving({
      element: 'div',
      elementAttributes: 'foo BAR'
    });

    div.setAttribute('FOO', 'FOO');
    div.setAttribute('bar', 'bar');

    assertSummary({
      attributeChanged: {'foo': [div], 'BAR': [div]},
      attributeOldValue: {'foo': [null], 'BAR': [null]}
    });
  });

  it('Element HTMLCaseInsensitive2', function () {
    startObserving({
      element: 'DIV[foo], A, *[bar], div[ BaZ = "bat"], span#foo[Blow~=blarg]',
      elementAttributes: 'FOO'
    });

    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('FOO', 'foo');
    const div2 = document.createElement('div');
    testDiv.appendChild(div2);
    div2.setAttribute('fooz', 'foo');
    const div3 = document.createElement('div')
    testDiv.appendChild(div3);
    div3.setAttribute('baz', 'fat');

    const span = document.createElement('span');
    div.appendChild(span);
    const p = document.createElement('P');
    testDiv.appendChild(p);
    p.setAttribute('baz', 'baz');
    assertSummary({
      added: [div],
      attributeChanged: {'FOO': []},
      attributeOldValue: {'FOO': []}
    });

    div.setAttribute('foo', 'blarg');

    p.removeAttribute('baz');
    p.setAttribute('bar', 'bar');
    div3.setAttribute('baz', 'bat');
    span.id = 'foo';
    span.setAttribute('bloW', 'blarg bloog');
    assertSummary({
      added: [p, div3, span],
      attributeChanged: {'FOO': [div]},
      attributeOldValue: {'FOO': ['foo']}
    });

    div3.removeAttribute('baz');
    div3.setAttribute('baz', 'bat');
    assertNothingReported();
  });

  it('Element SVGCaseSensitive', function () {
    const docType = document.implementation.createDocumentType("svg", "-//W3C//DTD SVG 1.1//EN", null);
    const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', docType);

    testDiv = svgDoc.createElement('div');

    startObserving({
      element: 'div[foo], a, *[bar], div[ BaZ = "bat"], SPAN#foo[Blow~=blarg]',
      elementAttributes: 'FOO'
    });

    const div = svgDoc.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('FOO', 'foo');

    const div2 = svgDoc.createElement('div');
    testDiv.appendChild(div2);
    div2.setAttribute('foo', 'foo');

    const div3 = svgDoc.createElement('div');
    testDiv.appendChild(div3);
    div3.setAttribute('baz', 'fat');

    const span = svgDoc.createElement('span');
    div.appendChild(span);
    const upperSpan = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'SPAN');
    div.appendChild(upperSpan);
    const p = svgDoc.createElement('P');
    testDiv.appendChild(p);
    p.setAttribute('bar', 'baz');
    assertSummary({
      added: [div2, p],
      attributeChanged: {'FOO': []},
      attributeOldValue: {'FOO': []}
    });

    div2.setAttribute('foo', 'bar');

    p.removeAttribute('bar');
    p.setAttribute('BAR', 'bar');

    div3.setAttribute('BaZ', 'bat');

    // Note: SVG Elements aren't HTMLElements, so el.id doesn't delegate to the 'id' attribute.
    upperSpan.setAttribute('id', 'foo');
    upperSpan.setAttribute('Blow', 'blarg bloog');
    assertSummary({
      added: [div3, upperSpan],
      removed: [p],
      attributeChanged: {'FOO': []},
      attributeOldValue: {'FOO': []}
    });

    div3.removeAttribute('baz');
    div3.setAttribute('baz', 'bat');
    assertNothingReported();
  });

  it('Element ElementAttributes', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('foo', 'bar');
    div.setAttribute('baz', 'bat');
    div.setAttribute('boo', 'bag');

    const div2 = document.createElement('div');
    testDiv.appendChild(div2);

    startObserving({
      element: '  div[  baz  ]',
      elementAttributes: 'foo boo',
    });

    div.setAttribute('foo', 'bar2');
    div.setAttribute('baz', 'bat2');
    div.setAttribute('boo', 'bag2');
    div.setAttribute('boo', 'bag');

    div2.setAttribute('baz', 'blarg');

    const div3 = document.createElement('div');
    testDiv.appendChild(div3);
    div3.setAttribute('baz', 'bar');
    div2.appendChild(div);
    assertSummary({
      added: [div2, div3],
      reparented: [div],
      attributeChanged: {'foo': [div], 'boo': []},
      attributeOldValue: {'foo': ['bar'], 'boo': []}
    });

    testDiv.appendChild(div);
    div3.removeAttribute('baz');
    testDiv.removeChild(div2);
    assertSummary({
      reparented: [div],
      removed: [div2, div3],
      attributeChanged: {'foo': [], 'boo': []},
      attributeOldValue: {'foo': [], 'boo': []}
    });

    div.setAttribute('foo', 'baz');
    div.setAttribute('foo', 'bar2');
    assertNothingReported();
  });

  it('Element With Classname', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);
    div.setAttribute('class', 'foo');

    const div2 = document.createElement('div');
    testDiv.appendChild(div2);

    startObserving({
      element: 'div.foo'
    });

    div.setAttribute('class', 'bar foo baz');
    div2.setAttribute('class', 'foo');

    const div3 = document.createElement('div');
    testDiv.appendChild(div3);
    div3.setAttribute('class', 'bar');
    assertSummary({
      added: [div2]
    });

    testDiv.removeChild(div);
    div2.removeAttribute('class');
    div3.setAttribute('class', 'foo');
    const div4 = document.createElement('div');
    testDiv.appendChild(div4);
    div4.setAttribute('class', 'foobaz');
    assertSummary({
      added: [div3],
      removed: [div, div2]
    });

    div3.setAttribute('class', 'bar');
    div3.setAttribute('class', 'foo bar');
    assertNothingReported();
  });

  it('NoValidator', function () {
    const validator = MutationSummary.createQueryValidator;
    MutationSummary.createQueryValidator = undefined;

    startObserving();

    const div = document.createElement('div');
    testDiv.appendChild(div);
    const span = document.createElement('span');
    div.appendChild(span);
    assertSummary({
      added: [div, span]
    });

    div.removeChild(span);
    assertSummary({
      removed: [span]
    });

    MutationSummary.createQueryValidator = validator;
  });

  it('Add Remove Basic', function () {
    startObserving();

    const div = document.createElement('div');
    testDiv.appendChild(div);
    const span = document.createElement('span');
    div.appendChild(span);
    assertSummary({
      added: [div, span]
    });

    div.removeChild(span);
    assertSummary({
      removed: [span],
    });
  });

  it('Sequential Removals', function () {
    const div = document.createElement('div');
    testDiv.appendChild(div);

    startObserving();

    testDiv.removeChild(div);
    const div2 = document.createElement('div');
    div2.appendChild(div);
    testDiv.appendChild(div2);
    div2.removeChild(div);
    assertSummary({
      added: [div2],
      removed: [div]
    });
  });

  it('Add And Remove Outside Tree', function () {
    const div1 = document.createElement('div');
    testDiv.appendChild(div1);
    const div2 = document.createElement('p');
    div1.appendChild(div2);
    const span = document.createElement('span');
    div2.appendChild(span);

    startObserving();
    testDiv.removeChild(div1);
    // This add will be ignored since this is a detached subtree.
    div1.appendChild(document.createElement('strong'));
    div1.removeChild(div2);
    div2.removeChild(span);
    assertSummary({
      removed: [div1, div2, span]
    });

    // This add will be ignored because it happens outside the document tree.
    div1.appendChild(document.createElement('span'));
    assertNothingReported();
  });

  it('Add Outside Of Tree And Reinsert', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));

    startObserving();
    testDiv.removeChild(div1);
    // This add is taking place while outside the tree, but should be considered
    // and 'add' because the parent node is later replaced.
    const span = div1.appendChild(document.createElement('span'));
    testDiv.appendChild(div1);
    assertSummary({
      added: [span]
    });
  });

  it('Reparented', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));
    div2.appendChild(document.createElement('span'));

    startObserving();

    testDiv.removeChild(div1);
    div1.removeChild(div2);
    testDiv.appendChild(div2);
    testDiv.appendChild(div1);
    assertSummary({
      reparented: [div2]
    });
  });

  it('Adding To Detached Subtree', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));

    startObserving();
    testDiv.removeChild(div1);
    const div2 = div1.appendChild(document.createElement('div'));
    div2.appendChild(document.createElement('span'));
    assertSummary({
      removed: [div1]
    });
  });

  it('Reorder Inside Tree', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = div2.appendChild(document.createElement('div'));

    startObserving();

    testDiv.removeChild(div1);
    div1.removeChild(div2);
    div2.removeChild(div3);
    testDiv.appendChild(div3);
    div3.appendChild(div2);
    div2.appendChild(div1);
    assertSummary({
      reparented: [div1, div2, div3]
    });
  });

  it('Removed Old Previous Sibling', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = testDiv.appendChild(document.createElement('div'));
    const div3 = testDiv.appendChild(document.createElement('div'));
    const div4 = div3.appendChild(document.createElement('div'));
    const div5 = div3.appendChild(document.createElement('div'));

    startObserving(undefined, {oldPreviousSibling: true});

    testDiv.removeChild(div1);
    testDiv.removeChild(div2);
    testDiv.removeChild(div3);

    assertSummary({
      removed: [div1, div2, div3, div4, div5],
      removedOldPreviousSibling: [null, div1, div2, null, div4]
    });
  });

  it('Reorder Inside Tree And Add Middle', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = div2.appendChild(document.createElement('div'));

    startObserving();

    testDiv.removeChild(div1);
    div1.removeChild(div2);
    div2.removeChild(div3);
    testDiv.appendChild(div3);
    div3.appendChild(div2);
    const div4 = document.createElement('div');
    div2.appendChild(div4);
    div4.appendChild(div1);
    assertSummary({
      added: [div4],
      reparented: [div1, div2, div3]
    });
  });

  it('Reorder Outside Tree', function () {
    const div1 = document.createElement('div');
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = div2.appendChild(document.createElement('div'));

    startObserving();

    div1.removeChild(div2);
    div2.removeChild(div3);
    div3.appendChild(div2);
    div2.appendChild(div1);

    assertNothingReported();
  });

  it('Reorder And Remove From Tree', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = div2.appendChild(document.createElement('div'));

    startObserving();

    testDiv.removeChild(div1);
    div1.removeChild(div2);
    div2.removeChild(div3);
    div3.appendChild(div2);
    div2.appendChild(div1);
    assertSummary({
      removed: [div1, div2, div3]
    });
  });

  it('Reorder And Remove Subtree', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));

    startObserving();

    div1.removeChild(div2);
    testDiv.appendChild(div2);
    div2.appendChild(div1);
    div2.removeChild(div1);
    assertSummary({
      reparented: [div2],
      removed: [div1]
    });
  });

  it('Reorder Outside And Add To Tree', function () {
    const div1 = document.createElement('div');
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = div2.appendChild(document.createElement('div'));

    startObserving();

    div1.removeChild(div2);
    div2.removeChild(div3);
    div3.appendChild(div2);
    div2.appendChild(div1);
    testDiv.appendChild(div3);
    assertSummary({
      added: [div1, div2, div3]
    });
  });

  it('Reorder Outside And Add Subtree', function () {
    const div1 = document.createElement('div');
    const div2 = div1.appendChild(document.createElement('div'));

    startObserving();

    div1.removeChild(div2);
    div2.appendChild(div1);
    testDiv.appendChild(div2);
    assertSummary({
      added: [div1, div2]
    });
  });

  it('Remove Subtree And Add To External', function () {
    const div1 = testDiv.appendChild(document.createElement('div'));
    const div2 = div1.appendChild(document.createElement('div'));
    const div3 = document.createElement('div');

    startObserving();
    testDiv.removeChild(div1);
    div3.appendChild(div1);
    assertSummary({
      removed: [div1, div2]
    });
  });

  function insertAfter(parent: Node, node: Node, refNode: Node): Node {
    return parent.insertBefore(node, refNode ? refNode.nextSibling : parent.firstChild);
  }

  it('Move', function () {
    const divA = document.createElement('div');
    testDiv.appendChild(divA);
    divA.id = 'a';
    const divB = document.createElement('div');
    testDiv.appendChild(divB);
    divB.id = 'b';
    const divC = document.createElement('div');
    testDiv.appendChild(divC);
    divC.id = 'c';
    const divD = document.createElement('div')
    testDiv.appendChild(divD);
    divD.id = 'd';

    startObserving();                 // A  B  C  D

    insertAfter(testDiv, divB, null); // [B] A  C  D
    insertAfter(testDiv, divC, null); // [C  B] A  D
    insertAfter(testDiv, divD, null); // [D  C  B] A

    // Final effect is [D  C  B] A
    assertSummary({
      reordered: [divD, divC, divB],
      reorderedOldPreviousSibling: [divC, divB, divA]
    });
  });

  it('Move2', function () {
    const divA = document.createElement('div');
    testDiv.appendChild(divA);
    divA.id = 'a';
    const divB = document.createElement('div');
    testDiv.appendChild(divB);
    divB.id = 'b';
    const divC = document.createElement('div')
    testDiv.appendChild(divC);
    divC.id = 'c';

    startObserving();                 // A  B  C

    insertAfter(testDiv, divA, divC); // B  C [A]
    insertAfter(testDiv, divB, divA); // C [A  B]

    // Final effect is C [A B]
    assertSummary({
      reordered: [divA, divB],
      reorderedOldPreviousSibling: [null, divA]
    });
  });

  it('Move Detect Noop', function () {
    const divA = document.createElement('div');
    testDiv.appendChild(divA);
    divA.id = 'a';
    const divB = document.createElement('div');
    testDiv.appendChild(divB);
    divB.id = 'b';
    const divC = document.createElement('div');
    testDiv.appendChild(divC);
    divC.id = 'c';
    const divD = document.createElement('div');
    testDiv.appendChild(divD);
    divD.id = 'd';
    const divE = document.createElement('div');
    testDiv.appendChild(divE);
    divE.id = 'e';
    const divF = document.createElement('div');
    testDiv.appendChild(divF);
    divF.id = 'f';
    const divG = document.createElement('div');
    divG.id = 'g';

    startObserving();                 // A  B  C  D  E  F

    insertAfter(testDiv, divD, divA); // A [D] B  C  E  F
    insertAfter(testDiv, divC, divA); // A [C  D] B  E  F
    insertAfter(testDiv, divB, divC); // A [C  B  D] E  F
    insertAfter(testDiv, divD, divA); // A [D  C  B] E  F
    insertAfter(testDiv, divG, divE); // A [D  C  B] E [G] F
    insertAfter(testDiv, divE, divG); // A [D  C  B  G  E] F

    // Final effect is A D [C B G] E F
    assertSummary({
      added: [divG],
      reordered: [divB, divC],
      reorderedOldPreviousSibling: [divA, divB]
    });

    insertAfter(testDiv, divC, divA);
    insertAfter(testDiv, divD, divA);
    assertNothingReported();
  });

  it('Move Detect Noop Simple',  () => {
    const divA = document.createElement('div');
    testDiv.appendChild(divA);
    divA.id = 'a';
    const divB = document.createElement('div');
    testDiv.appendChild(divB);
    divB.id = 'b';

    startObserving();                 // A  B

    insertAfter(testDiv, divA, divB); // B [A]
    insertAfter(testDiv, divB, divA); // [A B]
    insertAfter(testDiv, divA, divB); // [B A]

    // Final effect is B [A]
    assertSummary({
      reordered: [divA],
      reorderedOldPreviousSibling: [null]
    });
  });

  it('Ignore Own Changes',  (done: () => any) => {
    let div: Node;
    let count = 0;

    const summary1 = new MutationSummary({
      observeOwnChanges: false,
      rootNode: testDiv,
      queries: [{all: true}],
      callback(summaries: Summary[]) {
        const summary = summaries[0];
        count++;

        if (count == 1) {
          assert.strictEqual(1, summary.added.length)
          div = testDiv.appendChild(document.createElement('div'));
        } else if (count == 2) {
          assert.strictEqual(2, summary.added.length);
          div = testDiv.appendChild(document.createElement('div'));
          summary1.disconnect();
        } else if (count == 3) {
          assert.strictEqual(1, summary.added.length);
          summary1.disconnect();
          done();
        }
      }
    });

    const summary2 = new MutationSummary({
      rootNode: testDiv,
      observeOwnChanges: false,
      queries: [{all: true}],
      callback(summaries) {
        const summary = summaries[0];
        count++;

        if (count == 1) {
          assert.strictEqual(1, summary.added.length)
          div = testDiv.appendChild(document.createElement('div'));
        } else if (count == 2) {
          assert.strictEqual(2, summary.added.length);
          div = testDiv.appendChild(document.createElement('div'));
          summary2.disconnect();
        } else if (count == 3) {
          assert.strictEqual(1, summary.added.length);
          summary2.disconnect();
          done();
        }
      }
    });

    testDiv.appendChild(document.createElement('div'));
  });


  it('Disconnect During Callback', function (async: () => any) {
    const div = document.createElement('div');

    let callbackCount = 0;
    const summary = new MutationSummary({
      queries: [{all: true}],
      rootNode: div,
      callback: function (_) {
        callbackCount++;
        if (callbackCount > 1)
          return;

        summary.disconnect();
        setTimeout(function () {
          div.setAttribute('bar', 'baz');
          setTimeout(function () {
            assert.strictEqual(1, callbackCount);
            async();
          });
        }, 0);
      }
    });

    div.setAttribute('foo', 'bar');
  });
});

describe('TreeMirror Fuzzer', function () {

  let testDiv: HTMLElement;

  beforeEach(() => {
    testDiv = document.createElement('div');
    testDiv.id = 'test-div';
  });

  it('Fuzzer', function (async: () => any) {
    this.timeout(15000);

    const TREE_SIZE = 512;
    const PASSES = 128;
    const MOVES_PER_PASS = 128;
    const NON_DOC_ROOTS_MAX = 4;

    const allNodes: Node[] = []
    const nonRootNodes: Node[] = [];

    // Generate random document.
    randomTree(testDiv, TREE_SIZE);
    getReachable(testDiv, allNodes);
    getReachable(testDiv, nonRootNodes, true);

    // Generate some fragments which lie outside the document.
    const nonDocCount = randInt(1, NON_DOC_ROOTS_MAX);
    for (let i = 0; i < nonDocCount; i++) {
      const nonDoc = <HTMLElement>randomNode();
      nonDoc.id = 'ext' + i;
      randomTree(nonDoc, randInt(Math.floor(TREE_SIZE / 8),
          Math.floor(TREE_SIZE / 4)));
      getReachable(nonDoc, allNodes);
      getReachable(nonDoc, nonRootNodes, true);
    }

    const testingQueries: IQuery[] = [{characterData: true}];

    const attributeQuery: IQuery = {attribute: randomAttributeName()};
    testingQueries.push(attributeQuery);

    const elementQuery: IQuery = {
      element: randomTagname() + '[' + randomAttributeName() + ']',
      elementAttributes: randomAttributeName() + ' ' + randomAttributeName()
    };
    testingQueries.push(elementQuery);

    let pass = 0;
    const mirrorRoot = <HTMLElement>testDiv.cloneNode(false);
    const mirrorClient = new TreeMirrorClient(testDiv, new TreeMirror(mirrorRoot), testingQueries);

    function doNextPass() {
      for (let move = 0; move < MOVES_PER_PASS; move++) {
        randomMutation(allNodes, nonRootNodes);
      }

      pass++;

      setTimeout(checkNextPass, 0);
    }

    function checkNextPass() {
      assertTreesEqual(testDiv, mirrorRoot);

      if (pass >= PASSES) {
        mirrorClient.disconnect();
        async();
      } else
        doNextPass();
    }

    doNextPass();
  });

  function assertTreesEqual(node: HTMLElement, copy: HTMLElement) {
    assert.strictEqual(node.tagName, copy.tagName);
    assert.strictEqual(node.id, copy.id);

    assert.strictEqual(node.nodeType, copy.nodeType);
    if (node.nodeType == Node.ELEMENT_NODE) {
      assert.strictEqual(node.attributes.length, copy.attributes.length);
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        assert.strictEqual(attr.value, (<Element>copy).getAttribute(attr.name));
      }
    } else {
      assert.strictEqual(node.textContent, copy.textContent);
    }

    assert.strictEqual(node.childNodes.length, copy.childNodes.length);

    let copyChild = copy.firstChild;
    for (let child = node.firstChild; child; child = child.nextSibling) {
      assertTreesEqual(<HTMLElement>child, <HTMLElement>copyChild);
      copyChild = copyChild.nextSibling;
    }
  }

  function randomTree(root: Node, numNodes: number) {
    const MAX_CHILDREN = 8;

    function randDist(count: number, amount: number) {
      const buckets: number[] = [];

      while (count-- > 0)
        buckets[count] = 0;

      while (amount > 0) {
        const add = randInt(0, 1);
        buckets[randInt(0, buckets.length - 1)] += add;
        amount -= add;
      }

      return buckets;
    }

    if (numNodes <= 0)
      return;

    const childCount = Math.min(numNodes, MAX_CHILDREN);
    const childDist = randDist(childCount, numNodes - childCount);
    for (let i = 0; i < childDist.length; i++) {
      const maybeText = childDist[i] <= 1;
      const child = root.appendChild(randomNode(maybeText));
      // child.id = root.id + '.' + String.fromCharCode(65 + i);  // asci('A') + i.
      if (child.nodeType == Node.ELEMENT_NODE)
        randomTree(child, childDist[i]);
    }
  }

  const tagMenu = [
    'DIV',
    'SPAN',
    'P'
  ];

  function randomTagname() {
    return tagMenu[randInt(0, tagMenu.length - 1)];
  }

  const attributeMenu = [
    'foo',
    'bar',
    'baz',
    'bat',
    'bag',
    'blu',
    'coo',
    'dat'
  ];

  function randomAttributeName() {
    return attributeMenu[randInt(0, attributeMenu.length - 1)] + randInt(0, Number.MAX_SAFE_INTEGER);
  }

  const textMenu = [
    'Kermit',
    'Fozzy',
    'Gonzo',
    'Piggy',
    'Professor',
    'Scooter',
    'Animal',
    'Beaker'
  ];

  function randomText() {
    return textMenu[randInt(0, textMenu.length - 1)];
  }

  function randomNode(maybeText?: boolean): Node {
    let node: Node;
    if (maybeText && !randInt(0, 8)) {
      const text = randomText();
      if (randInt(0, 1))
        node = document.createTextNode(text);
      else
        node = document.createComment(text);
    } else {
      node = document.createElement(randomTagname());
    }
    return node;
  }

  function randInt(start: number, end: number) {
    return Math.round(Math.random() * (end - start) + start);
  }

  function getReachable(root: Node, reachable: Node[], excludeRoot?: boolean) {
    if (!excludeRoot)
      reachable.push(root);
    if (!root.childNodes || !root.childNodes.length)
      return;

    for (let child = root.firstChild; child; child = child.nextSibling) {
      getReachable(child, reachable);
    }

    return;
  }

  function randomMutation(allNodes: Node[], nonRootNodes: Node[]) {

    function nodeIsDescendant(root: Node, target: Node) {
      if (!target)
        return false;
      if (root === target)
        return true;

      return nodeIsDescendant(root, target.parentNode);
    }

    function selectNodeAtRandom(nodes: Node[],
                                excludeNodeAndDescendants?: Node,
                                isElement?: boolean): Node {
      let node: Node;
      while (!node || nodeIsDescendant(excludeNodeAndDescendants, node) || (isElement && node.nodeType != Node.ELEMENT_NODE))
        node = nodes[randInt(0, nodes.length - 1)];
      return node;
    }

    function moveNode(allNodes: Node[], node: Node) {
      const parent = selectNodeAtRandom(allNodes, node, true);
      // NOTE: The random index here maybe be childNodes[childNodes.length]
      // which is undefined, meaning 'insert at end of childlist'.
      const beforeNode = parent.childNodes[randInt(0, parent.childNodes.length)];

      parent.insertBefore(node, beforeNode);
    }

    function mutateAttribute(node: Element) {
      const attrName = randomAttributeName();
      if (randInt(0, 1))
        node.setAttribute(attrName, String(randInt(0, 9)));
      else
        node.removeAttribute(attrName);
    }

    function mutateText(node: Node) {
      node.textContent = randomText();
    }

    const node = selectNodeAtRandom(nonRootNodes);

    if (randInt(0, 1)) {
      moveNode(allNodes, node);
      return;
    }

    if (node.nodeType == Node.TEXT_NODE)
      mutateText(node);
    else if (node.nodeType == Node.ELEMENT_NODE)
      mutateAttribute(<Element>node);
  }
});
