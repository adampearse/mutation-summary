import {Selector} from "./Selector";
import {IQuery} from "./IQuery";
import {IMutationSummaryOptions} from "./IMutationSummaryOptions";
import {Summary} from "./Summary";
import {IStringMap} from "./IStringMap";
import {MutationProjection} from "./MutationProjection";
import {IQueryValidator} from "./IQueryValidator";

const attributeFilterPattern = /^([a-zA-Z:_]+[a-zA-Z0-9_\-:.]*)$/;

function validateAttribute(attribute: string) {
  if (typeof attribute != 'string')
    throw Error('Invalid request option. attribute must be a non-zero length string.');

  attribute = attribute.trim();

  if (!attribute)
    throw Error('Invalid request option. attribute must be a non-zero length string.');


  if (!attribute.match(attributeFilterPattern))
    throw Error('Invalid request option. invalid attribute name: ' + attribute);

  return attribute;
}

function validateElementAttributes(attribs: string): string[] {
  if (!attribs.trim().length)
    throw Error('Invalid request option: elementAttributes must contain at least one attribute.');

  const lowerAttributes = {};
  const attributes = {};

  const tokens = attribs.split(/\s+/);
  for (let i = 0; i < tokens.length; i++) {
    let name = tokens[i];
    if (!name)
      continue;

    name = validateAttribute(name);
    const nameLower = name.toLowerCase();
    if (lowerAttributes[nameLower])
      throw Error('Invalid request option: observing multiple case variations of the same attribute is not supported.');

    attributes[name] = true;
    lowerAttributes[nameLower] = true;
  }

  return Object.keys(attributes);
}

function elementFilterAttributes(selectors: Selector[]): string[] {
  const attributes: IStringMap<boolean> = {};

  selectors.forEach((selector) => {
    selector.qualifiers.forEach((qualifier) => {
      attributes[qualifier.attrName] = true;
    });
  });

  return Object.keys(attributes);
}

export class MutationSummary {

  public static createQueryValidator: (root: Node, query: IQuery) => IQueryValidator;

  private connected: boolean;
  private options: IMutationSummaryOptions;
  private observer: MutationObserver;
  private readonly observerOptions: MutationObserverInit;
  private readonly root: Node;
  private readonly callback: (summaries: Summary[]) => any;
  private readonly elementFilter: Selector[];
  private readonly calcReordered: boolean;
  private queryValidators: IQueryValidator[];

  private static optionKeys: IStringMap<boolean> = {
    'callback': true, // required
    'queries': true,  // required
    'rootNode': true,
    'oldPreviousSibling': true,
    'observeOwnChanges': true
  };

  private static createObserverOptions(queries: IQuery[]): MutationObserverInit {
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

      const attributes = elementFilterAttributes(query.elementFilter).concat(query.attributeList || []);
      if (attributes.length)
        observeAttributes(attributes);
    });

    if (attributeFilter)
      observerOptions.attributeFilter = Object.keys(attributeFilter);

    return observerOptions;
  }

  private static validateOptions(options: IMutationSummaryOptions): IMutationSummaryOptions {
    for (let prop in options) {
      if (!(prop in MutationSummary.optionKeys))
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
          attribute: validateAttribute(request.attribute)
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
          query.attributeList = validateElementAttributes(request.elementAttributes);
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

  private createSummaries(mutations: MutationRecord[]): Summary[] {
    if (!mutations || !mutations.length)
      return [];

    const projection = new MutationProjection(this.root, mutations, this.elementFilter, this.calcReordered, this.options.oldPreviousSibling);

    const summaries: Summary[] = [];
    for (let i = 0; i < this.options.queries.length; i++) {
      summaries.push(new Summary(projection, this.options.queries[i]));
    }

    return summaries;
  }

  private checkpointQueryValidators() {
    this.queryValidators.forEach((validator) => {
      if (validator)
        validator.recordPreviousState();
    });
  }

  private runQueryValidators(summaries: Summary[]) {
    this.queryValidators.forEach((validator: IQueryValidator, index) => {
      if (validator)
        validator.validate(summaries[index]);
    });
  }

  private changesToReport(summaries: Summary[]): boolean {
    return summaries.some((summary) => {
      const summaryProps = ['added', 'removed', 'reordered', 'reparented',
        'valueChanged', 'characterDataChanged'];
      if (summaryProps.some(function (prop) {
        return summary[prop] && summary[prop].length;
      }))
        return true;

      if (summary.attributeChanged) {
        const attrNames = Object.keys(summary.attributeChanged);
        const attrsChanged = attrNames.some((attrName) => {
          return !!summary.attributeChanged[attrName].length
        });
        if (attrsChanged)
          return true;
      }
      return false;
    });
  }

  constructor(opts: IMutationSummaryOptions) {
    this.connected = false;
    this.options = MutationSummary.validateOptions(opts);
    this.observerOptions = MutationSummary.createObserverOptions(this.options.queries);
    this.root = this.options.rootNode;
    this.callback = this.options.callback;

    this.elementFilter = Array.prototype.concat.apply([], this.options.queries.map((query) => {
      return query.elementFilter ? query.elementFilter : [];
    }));
    if (!this.elementFilter.length)
      this.elementFilter = undefined;

    this.calcReordered = this.options.queries.some((query) => {
      return query.all;
    });

    this.queryValidators = []; // TODO(rafaelw): Shouldn't always define this.
    if (MutationSummary.createQueryValidator) {
      this.queryValidators = this.options.queries.map((query) => {
        return MutationSummary.createQueryValidator(this.root, query);
      });
    }

    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      this.observerCallback(mutations);
    });

    this.reconnect();
  }

  private observerCallback(mutations: MutationRecord[]) {
    if (!this.options.observeOwnChanges)
      this.observer.disconnect();

    const summaries = this.createSummaries(mutations);
    this.runQueryValidators(summaries);

    if (this.options.observeOwnChanges)
      this.checkpointQueryValidators();

    if (this.changesToReport(summaries))
      this.callback(summaries);

    // disconnect() may have been called during the callback.
    if (!this.options.observeOwnChanges && this.connected) {
      this.checkpointQueryValidators();
      this.observer.observe(this.root, this.observerOptions);
    }
  }

  reconnect() {
    if (this.connected)
      throw Error('Already connected');

    this.observer.observe(this.root, this.observerOptions);
    this.connected = true;
    this.checkpointQueryValidators();
  }

  takeSummaries(): Summary[] {
    if (!this.connected)
      throw Error('Not connected');

    const summaries = this.createSummaries(this.observer.takeRecords());
    return this.changesToReport(summaries) ? summaries : undefined;
  }

  disconnect(): Summary[] {
    const summaries = this.takeSummaries();
    this.observer.disconnect();
    this.connected = false;
    return summaries;
  }
}