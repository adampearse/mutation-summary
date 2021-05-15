import {Selector} from "./Selector";

export interface IQuery {
  element?: string;
  attribute?: string;
  all?: boolean;
  characterData?: boolean;
  elementAttributes?: string;
  attributeList?: string[];
  elementFilter?: Selector[];
}