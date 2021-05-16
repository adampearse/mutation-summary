import {IStringMap} from "../IStringMap";

export interface INodeData {
  id: number;
  nodeType?: number;
  name?: string;
  publicId?: string;
  systemId?: string;
  textContent?: string;
  tagName?: string;
  attributes?: IStringMap<string>;
  childNodes?: INodeData[];
}