import {Selector} from "./Selector";

/**
 * The IQuery interface represents a filter of elements to observe within
 * the dom subtree that the MutationSummary is observing.
 */
export interface IQuery {
  element?: string;
  attribute?: string;
  all?: boolean;
  characterData?: boolean;
  elementAttributes?: string;
  attributeList?: string[];
  elementFilter?: Selector[];
}