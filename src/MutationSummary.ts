import {Selector} from "./Selector";
import {IQuery} from "./IQuery";
import {IMutationSummaryOptions} from "./IMutationSummaryOptions";
import {Summary} from "./Summary";
import {MutationProjection} from "./MutationProjection";
import {IQueryValidator} from "./IQueryValidator";
import {MutationSummaryOptionProcessor} from "./MutationSummaryOptionProcessor";

/**
 * This is the main entry point class for the Mutation Summary library. When
 * created, a MutationSummary takes care of the details of observing the DOM
 * for changes, computing the "net-effect" of what's changed and then delivers
 * these changes to the provided callback.
 *
 * @example
 * ```
 *
 * const ms = new MutationSummary({
 * callback(summaries: Summary[]) {
 *    summaries.forEach((summary: Summary) => console.log(summary));
 *  },
 *  queries: [
 *    { all: true }
 *  ]
 * });
 * ```
 */
export class MutationSummary {

  // TODO move this to a configuration option.
  public static createQueryValidator: (root: Node, query: IQuery) => IQueryValidator;

  private _connected: boolean;
  private _options: IMutationSummaryOptions;
  private _observer: MutationObserver;
  private readonly _observerOptions: MutationObserverInit;
  private readonly _root: Node;
  private readonly _callback: (summaries: Summary[]) => any;
  private readonly _elementFilter: Selector[];
  private readonly _calcReordered: boolean;
  private _queryValidators: IQueryValidator[];

  /**
   * Creates a new MutationSummary class using the specified options.
   *
   * @param opts The options that configure how the MutationSummary
   *             instance will observe and report changes.
   */
  constructor(opts: IMutationSummaryOptions) {
    this._connected = false;
    this._options = MutationSummaryOptionProcessor.validateOptions(opts);
    this._observerOptions = MutationSummaryOptionProcessor.createObserverOptions(this._options.queries);
    this._root = this._options.rootNode;
    this._callback = this._options.callback;

    this._elementFilter = Array.prototype.concat.apply([], this._options.queries.map((query) => {
      return query.elementFilter ? query.elementFilter : [];
    }));
    if (!this._elementFilter.length)
      this._elementFilter = undefined;

    this._calcReordered = this._options.queries.some((query) => {
      return query.all;
    });

    this._queryValidators = []; // TODO(rafaelw): Shouldn't always define this.
    if (MutationSummary.createQueryValidator) {
      this._queryValidators = this._options.queries.map((query) => {
        return MutationSummary.createQueryValidator(this._root, query);
      });
    }

    this._observer = new MutationObserver((mutations: MutationRecord[]) => {
      this._observerCallback(mutations);
    });

    this.reconnect();
  }

  /**
   * Starts observation using an existing `MutationSummary` which has been
   * disconnected. Note that this function is just a convenience method for
   * creating a new `MutationSummary` with the same options. The next time
   * changes are reported, they will relative to the state of the observed
   * DOM at the point that `reconnect` was called.
   */
  public reconnect(): void {
    if (this._connected)
      throw Error('Already connected');

    this._observer.observe(this._root, this._observerOptions);
    this._connected = true;
    this._checkpointQueryValidators();
  }

  /**
   * Immediately calculates changes and returns them as an array of summaries.
   * If there are no changes to report, returns undefined.
   */
  public takeSummaries(): Summary[] | undefined {
    if (!this._connected)
      throw Error('Not connected');

    const summaries = this._createSummaries(this._observer.takeRecords());
    return this._changesToReport(summaries) ? summaries : undefined;
  }

  /**
   * Discontinues observation immediately. If DOM changes are pending delivery,
   * they will be fetched and reported as the same array of summaries which
   * are handed into the callback. If there is nothing to report,
   * this function returns undefined.
   *
   * @returns A list of changes that have not yet been delivered to a callback.
   */
  public disconnect(): Summary[] | undefined {
    const summaries = this.takeSummaries();
    this._observer.disconnect();
    this._connected = false;
    return summaries;
  }

  private _observerCallback(mutations: MutationRecord[]): void {
    if (!this._options.observeOwnChanges)
      this._observer.disconnect();

    const summaries = this._createSummaries(mutations);
    this._runQueryValidators(summaries);

    if (this._options.observeOwnChanges)
      this._checkpointQueryValidators();

    if (this._changesToReport(summaries))
      this._callback(summaries);

    // disconnect() may have been called during the callback.
    if (!this._options.observeOwnChanges && this._connected) {
      this._checkpointQueryValidators();
      this._observer.observe(this._root, this._observerOptions);
    }
  }

  private _createSummaries(mutations: MutationRecord[]): Summary[] {
    if (!mutations || !mutations.length)
      return [];

    const projection = new MutationProjection(this._root, mutations, this._elementFilter, this._calcReordered, this._options.oldPreviousSibling);

    const summaries: Summary[] = [];
    for (let i = 0; i < this._options.queries.length; i++) {
      summaries.push(new Summary(projection, this._options.queries[i]));
    }

    return summaries;
  }

  private _checkpointQueryValidators() {
    this._queryValidators.forEach((validator) => {
      if (validator)
        validator.recordPreviousState();
    });
  }

  private _runQueryValidators(summaries: Summary[]) {
    this._queryValidators.forEach((validator: IQueryValidator, index) => {
      if (validator)
        validator.validate(summaries[index]);
    });
  }

  private _changesToReport(summaries: Summary[]): boolean {
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
}
