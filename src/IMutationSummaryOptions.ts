import {Summary} from "./Summary";
import {IQuery} from "./IQuery";

export interface IMutationSummaryOptions {
  callback: (summaries: Summary[]) => any;
  queries: IQuery[];
  rootNode?: Node;
  oldPreviousSibling?: boolean;
  observeOwnChanges?: boolean;
}