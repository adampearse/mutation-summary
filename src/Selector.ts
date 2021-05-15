// TODO(rafaelw): Allow ':' and '.' as valid name characters.
import {Qualifier} from "./Qualifier";
import {NodeChange} from "./NodeChange";
import {Movement} from "./Movement";

var validNameInitialChar = /[a-zA-Z_]+/;
var validNameNonInitialChar = /[a-zA-Z0-9_\-]+/;

export class Selector {
  private static nextUid: number = 1;
  private static matchesSelector: string = (function () {
    var element = document.createElement('div');
    if (typeof element['webkitMatchesSelector'] === 'function')
      return 'webkitMatchesSelector';
    if (typeof element['mozMatchesSelector'] === 'function')
      return 'mozMatchesSelector';
    if (typeof element['msMatchesSelector'] === 'function')
      return 'msMatchesSelector';

    return 'matchesSelector';
  })();

  public tagName: string;
  public qualifiers: Qualifier[];
  public uid: number;

  private get caseInsensitiveTagName(): string {
    return this.tagName.toUpperCase();
  }

  get selectorString() {
    return this.tagName + this.qualifiers.join('');
  }

  constructor() {
    this.uid = Selector.nextUid++;
    this.qualifiers = [];
  }

  private isMatching(el: Element): boolean {
    return el[Selector.matchesSelector](this.selectorString);
  }

  private wasMatching(el: Element, change: NodeChange, isMatching: boolean): boolean {
    if (!change || !change.attributes)
      return isMatching;

    var tagName = change.isCaseInsensitive ? this.caseInsensitiveTagName : this.tagName;
    if (tagName !== '*' && tagName !== el.tagName)
      return false;

    var attributeOldValues: string[] = [];
    var anyChanged = false;
    for (var i = 0; i < this.qualifiers.length; i++) {
      var qualifier = this.qualifiers[i];
      var oldValue = change.getAttributeOldValue(qualifier.attrName);
      attributeOldValues.push(oldValue);
      anyChanged = anyChanged || (oldValue !== undefined);
    }

    if (!anyChanged)
      return isMatching;

    for (var i = 0; i < this.qualifiers.length; i++) {
      var qualifier = this.qualifiers[i];
      var oldValue = attributeOldValues[i];
      if (oldValue === undefined)
        oldValue = el.getAttribute(qualifier.attrName);
      if (!qualifier.matches(oldValue))
        return false;
    }

    return true;
  }

  public matchabilityChange(el: Element, change: NodeChange): Movement {
    var isMatching = this.isMatching(el);
    if (isMatching)
      return this.wasMatching(el, change, isMatching) ? Movement.STAYED_IN : Movement.ENTERED;
    else
      return this.wasMatching(el, change, isMatching) ? Movement.EXITED : Movement.STAYED_OUT;
  }

  public static parseSelectors(input: string): Selector[] {
    var selectors: Selector[] = [];
    var currentSelector: Selector;
    var currentQualifier: Qualifier;

    function newSelector() {
      if (currentSelector) {
        if (currentQualifier) {
          currentSelector.qualifiers.push(currentQualifier);
          currentQualifier = undefined;
        }

        selectors.push(currentSelector);
      }
      currentSelector = new Selector();
    }

    function newQualifier() {
      if (currentQualifier)
        currentSelector.qualifiers.push(currentQualifier);

      currentQualifier = new Qualifier();
    }

    var WHITESPACE = /\s/;
    var valueQuoteChar: string;
    var SYNTAX_ERROR = 'Invalid or unsupported selector syntax.';

    var SELECTOR = 1;
    var TAG_NAME = 2;
    var QUALIFIER = 3;
    var QUALIFIER_NAME_FIRST_CHAR = 4;
    var QUALIFIER_NAME = 5;
    var ATTR_NAME_FIRST_CHAR = 6;
    var ATTR_NAME = 7;
    var EQUIV_OR_ATTR_QUAL_END = 8;
    var EQUAL = 9;
    var ATTR_QUAL_END = 10;
    var VALUE_FIRST_CHAR = 11;
    var VALUE = 12;
    var QUOTED_VALUE = 13;
    var SELECTOR_SEPARATOR = 14;

    var state = SELECTOR;
    var i = 0;
    while (i < input.length) {
      var c = input[i++];

      switch (state) {
        case SELECTOR:
          if (c.match(validNameInitialChar)) {
            newSelector();
            currentSelector.tagName = c;
            state = TAG_NAME;
            break;
          }

          if (c == '*') {
            newSelector();
            currentSelector.tagName = '*';
            state = QUALIFIER;
            break;
          }

          if (c == '.') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.attrName = 'class';
            currentQualifier.contains = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.attrName = 'id';
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newSelector();
            newQualifier();
            currentSelector.tagName = '*';
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case TAG_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentSelector.tagName += c;
            break;
          }

          if (c == '.') {
            newQualifier();
            currentQualifier.attrName = 'class';
            currentQualifier.contains = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.attrName = 'id';
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }

          if (c == ',') {
            state = SELECTOR;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER:
          if (c == '.') {
            newQualifier();
            currentQualifier.attrName = 'class';
            currentQualifier.contains = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.attrName = 'id';
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            currentQualifier.attrName = '';
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }

          if (c == ',') {
            state = SELECTOR;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER_NAME_FIRST_CHAR:
          if (c.match(validNameInitialChar)) {
            currentQualifier.attrValue = c;
            state = QUALIFIER_NAME;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case QUALIFIER_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentQualifier.attrValue += c;
            break;
          }

          if (c == '.') {
            newQualifier();
            currentQualifier.attrName = 'class';
            currentQualifier.contains = true;
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '#') {
            newQualifier();
            currentQualifier.attrName = 'id';
            state = QUALIFIER_NAME_FIRST_CHAR;
            break;
          }
          if (c == '[') {
            newQualifier();
            state = ATTR_NAME_FIRST_CHAR;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = SELECTOR_SEPARATOR;
            break;
          }
          if (c == ',') {
            state = SELECTOR;
            break
          }

          throw Error(SYNTAX_ERROR);

        case ATTR_NAME_FIRST_CHAR:
          if (c.match(validNameInitialChar)) {
            currentQualifier.attrName = c;
            state = ATTR_NAME;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case ATTR_NAME:
          if (c.match(validNameNonInitialChar)) {
            currentQualifier.attrName += c;
            break;
          }

          if (c.match(WHITESPACE)) {
            state = EQUIV_OR_ATTR_QUAL_END;
            break;
          }

          if (c == '~') {
            currentQualifier.contains = true;
            state = EQUAL;
            break;
          }

          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR;
            break;
          }

          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          throw Error(SYNTAX_ERROR);

        case EQUIV_OR_ATTR_QUAL_END:
          if (c == '~') {
            currentQualifier.contains = true;
            state = EQUAL;
            break;
          }

          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR;
            break;
          }

          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case EQUAL:
          if (c == '=') {
            currentQualifier.attrValue = '';
            state = VALUE_FIRST_CHAR
            break;
          }

          throw Error(SYNTAX_ERROR);

        case ATTR_QUAL_END:
          if (c == ']') {
            state = QUALIFIER;
            break;
          }

          if (c.match(WHITESPACE))
            break;

          throw Error(SYNTAX_ERROR);

        case VALUE_FIRST_CHAR:
          if (c.match(WHITESPACE))
            break;

          if (c == '"' || c == "'") {
            valueQuoteChar = c;
            state = QUOTED_VALUE;
            break;
          }

          currentQualifier.attrValue += c;
          state = VALUE;
          break;

        case VALUE:
          if (c.match(WHITESPACE)) {
            state = ATTR_QUAL_END;
            break;
          }
          if (c == ']') {
            state = QUALIFIER;
            break;
          }
          if (c == "'" || c == '"')
            throw Error(SYNTAX_ERROR);

          currentQualifier.attrValue += c;
          break;

        case QUOTED_VALUE:
          if (c == valueQuoteChar) {
            state = ATTR_QUAL_END;
            break;
          }

          currentQualifier.attrValue += c;
          break;

        case SELECTOR_SEPARATOR:
          if (c.match(WHITESPACE))
            break;

          if (c == ',') {
            state = SELECTOR;
            break
          }

          throw Error(SYNTAX_ERROR);
      }
    }

    switch (state) {
      case SELECTOR:
      case TAG_NAME:
      case QUALIFIER:
      case QUALIFIER_NAME:
      case SELECTOR_SEPARATOR:
        // Valid end states.
        newSelector();
        break;
      default:
        throw Error(SYNTAX_ERROR);
    }

    if (!selectors.length)
      throw Error(SYNTAX_ERROR);

    return selectors;
  }
}