import {IStringMap} from "./IStringMap";
import {IQuery} from "./IQuery";
import {IMutationSummaryOptions} from "./IMutationSummaryOptions";
import {Selector} from "./Selector";

export class MutationSummaryOptionProcessor {
  private static _attributeFilterPattern = /^([a-zA-Z:_]+[a-zA-Z0-9_\-:.]*)$/;
  private static _optionKeys: IStringMap<boolean> = {
    'callback': true, // required
    'queries': true,  // required
    'rootNode': true,
    'oldPreviousSibling': true,
    'observeOwnChanges': true
  };

  public static createObserverOptions(queries: IQuery[]): MutationObserverInit {
    const observerOptions: MutationObserverInit = {
      childList: true,
      subtree: true
    };

    let attributeFilter: IStringMap<boolean>;

    function observeAttributes(attributes?: string[]) {
      if (observerOptions.attributes && !attributeFilter)
        return; // already observing all.

      observerOptions.attributes = true;
      observerOptions.attributeOldValue = true;

      if (!attributes) {
        // observe all.
        attributeFilter = undefined;
        return;
      }

      // add to observed.
      attributeFilter = attributeFilter || {};
      attributes.forEach((attribute) => {
        attributeFilter[attribute] = true;
        attributeFilter[attribute.toLowerCase()] = true;
      });
    }

    queries.forEach((query) => {
      if (query.characterData) {
        observerOptions.characterData = true;
        observerOptions.characterDataOldValue = true;
        return;
      }

      if (query.all) {
        observeAttributes();
        observerOptions.characterData = true;
        observerOptions.characterDataOldValue = true;
        return;
      }

      if (query.attribute) {
        observeAttributes([query.attribute.trim()]);
        return;
      }

      const attributes = MutationSummaryOptionProcessor._elementFilterAttributes(query.elementFilter).concat(query.attributeList || []);
      if (attributes.length)
        observeAttributes(attributes);
    });

    if (attributeFilter)
      observerOptions.attributeFilter = Object.keys(attributeFilter);

    return observerOptions;
  }

  public static validateOptions(options: IMutationSummaryOptions): IMutationSummaryOptions {
    for (let prop in options) {
      if (!(prop in MutationSummaryOptionProcessor._optionKeys))
        throw Error('Invalid option: ' + prop);
    }

    if (typeof options.callback !== 'function')
      throw Error('Invalid options: callback is required and must be a function');

    if (!options.queries || !options.queries.length)
      throw Error('Invalid options: queries must contain at least one query request object.');

    const opts: IMutationSummaryOptions = {
      callback: options.callback,
      rootNode: options.rootNode || document,
      observeOwnChanges: !!options.observeOwnChanges,
      oldPreviousSibling: !!options.oldPreviousSibling,
      queries: []
    };

    for (let i = 0; i < options.queries.length; i++) {
      const request = options.queries[i];

      // all
      if (request.all) {
        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. all has no options.');

        opts.queries.push({all: true});
        continue;
      }

      // attribute
      if ('attribute' in request) {
        const query: IQuery = {
          attribute: MutationSummaryOptionProcessor._validateAttribute(request.attribute)
        };

        query.elementFilter = Selector.parseSelectors('*[' + query.attribute + ']');

        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. attribute has no options.');

        opts.queries.push(query);
        continue;
      }

      // element
      if ('element' in request) {
        let requestOptionCount = Object.keys(request).length;
        const query: IQuery = {
          element: request.element,
          elementFilter: Selector.parseSelectors(request.element)
        };

        if (request.hasOwnProperty('elementAttributes')) {
          query.attributeList = MutationSummaryOptionProcessor._validateElementAttributes(request.elementAttributes);
          requestOptionCount--;
        }

        if (requestOptionCount > 1)
          throw Error('Invalid request option. element only allows elementAttributes option.');

        opts.queries.push(query);
        continue;
      }

      // characterData
      if (request.characterData) {
        if (Object.keys(request).length > 1)
          throw Error('Invalid request option. characterData has no options.');

        opts.queries.push({characterData: true});
        continue;
      }

      throw Error('Invalid request option. Unknown query request.');
    }

    return opts;
  }

  private static _validateElementAttributes(attribs: string): string[] {
    if (!attribs.trim().length)
      throw Error('Invalid request option: elementAttributes must contain at least one attribute.');

    const lowerAttributes = {};
    const attributes = {};

    const tokens = attribs.split(/\s+/);
    for (let i = 0; i < tokens.length; i++) {
      let name = tokens[i];
      if (!name)
        continue;

      name = MutationSummaryOptionProcessor._validateAttribute(name);
      const nameLower = name.toLowerCase();
      if (lowerAttributes[nameLower])
        throw Error('Invalid request option: observing multiple case variations of the same attribute is not supported.');

      attributes[name] = true;
      lowerAttributes[nameLower] = true;
    }

    return Object.keys(attributes);
  }

  private static _elementFilterAttributes(selectors: Selector[]): string[] {
    const attributes: IStringMap<boolean> = {};

    selectors.forEach((selector) => {
      selector.qualifiers.forEach((qualifier) => {
        attributes[qualifier.attrName] = true;
      });
    });

    return Object.keys(attributes);
  }

  private static _validateAttribute(attribute: string) {
    if (typeof attribute != 'string')
      throw Error('Invalid request option. attribute must be a non-zero length string.');

    attribute = attribute.trim();

    if (!attribute)
      throw Error('Invalid request option. attribute must be a non-zero length string.');


    if (!attribute.match(MutationSummaryOptionProcessor._attributeFilterPattern))
      throw Error('Invalid request option. invalid attribute name: ' + attribute);

    return attribute;
  }

}