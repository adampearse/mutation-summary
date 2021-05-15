import {INodeData} from "./INodeData";

export interface IPositionData extends INodeData {
  previousSibling: INodeData;
  parentNode: INodeData;
}