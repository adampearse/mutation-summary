import {INodeData} from "./INodeData";
import {IStringMap} from "../IStringMap";

export interface IAttributeData extends INodeData {
  attributes: IStringMap<string>;
}