import {Summary} from "./Summary";
import {IQuery} from "./IQuery";

/**
 * The IMutationSummaryOptions defines the set of configuration options that
 * can be passed to the [[MutationSummary]] class.
 */
export interface IMutationSummaryOptions {
  /**
   * A callback function which will be invoked when there are changes matching
   * any of the requested `queries`. The callback will be passed an array
   * of Summary objects that describe the mutations.
   */
  callback: (summaries: Summary[]) => any;

  /**
   * A non-empty array of query request objects that define what elements
   * will be monitored for mutations.
   */
  queries: IQuery[];

  /**
   * Defaults to `window.document`. The root of the sub-tree to observe.
   */
  rootNode?: Node;

  /**
   * Defaults to `false`. If true, `getOldPreviousSibling` can be called
   * with nodes returned in `removed` and `reparented`.
   */
  oldPreviousSibling?: boolean;

  /**
   * Defaults to `false`. Configures whether changes made during the course of
   * the `callback` invocation are observed for potential delivery in the next
   * `callback` invocation.
   */
  observeOwnChanges?: boolean;
}