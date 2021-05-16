// Copyright 2013 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {INumberMap} from "../INumberMap";
import {INodeData} from "./INodeData";
import {IPositionData} from "./IPositionData";
import {IAttributeData} from "./IAttributeData";
import {ITextData} from "./ITextData";

export class TreeMirror {

  private readonly idMap: INumberMap<Node>;

  constructor(public root: Node, public delegate?: any) {
    this.idMap = {};
  }

  initialize(rootId: number, children: INodeData[]) {
    this.idMap[rootId] = this.root;

    for (let i = 0; i < children.length; i++)
      this.deserializeNode(children[i], <Element>this.root);
  }

  applyChanged(removed: INodeData[],
               addedOrMoved: IPositionData[],
               attributes: IAttributeData[],
               text: ITextData[]) {

    // NOTE: Applying the changes can result in an attempting to add a child
    // to a parent which is presently an ancestor of the parent. This can occur
    // based on random ordering of moves. The way we handle this is to first
    // remove all changed nodes from their parents, then apply.
    addedOrMoved.forEach((data: IPositionData) => {
      const node = this.deserializeNode(data);
      this.deserializeNode(data.parentNode);
      this.deserializeNode(data.previousSibling);
      if (node.parentNode)
        node.parentNode.removeChild(node);
    });

    removed.forEach((data: INodeData) => {
      const node = this.deserializeNode(data);
      if (node.parentNode)
        node.parentNode.removeChild(node);
    });

    addedOrMoved.forEach((data: IPositionData) => {
      const node = this.deserializeNode(data);
      const parent = this.deserializeNode(data.parentNode);
      const previous = this.deserializeNode(data.previousSibling);
      parent.insertBefore(node,
          previous ? previous.nextSibling : parent.firstChild);
    });

    attributes.forEach((data: IAttributeData) => {
      const node = <Element>this.deserializeNode(data);
      Object.keys(data.attributes).forEach((attrName) => {
        const newVal = data.attributes[attrName];
        if (newVal === null) {
          node.removeAttribute(attrName);
        } else {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, attrName, newVal)) {
            node.setAttribute(attrName, newVal);
          }
        }
      });
    });

    text.forEach((data: ITextData) => {
      const node = this.deserializeNode(data);
      node.textContent = data.textContent;
    });

    removed.forEach((node: INodeData) => {
      delete this.idMap[node.id];
    });
  }

  private deserializeNode(nodeData: INodeData, parent?: Element): Node {
    if (nodeData === null)
      return null;

    let node: Node = this.idMap[nodeData.id];
    if (node)
      return node;

    let doc = this.root.ownerDocument;
    if (doc === null)
      doc = <HTMLDocument>this.root;

    switch (nodeData.nodeType) {
      case Node.COMMENT_NODE:
        node = doc.createComment(nodeData.textContent);
        break;

      case Node.TEXT_NODE:
        node = doc.createTextNode(nodeData.textContent);
        break;

      case Node.DOCUMENT_TYPE_NODE:
        node = doc.implementation.createDocumentType(nodeData.name, nodeData.publicId, nodeData.systemId);
        break;

      case Node.ELEMENT_NODE:
        if (this.delegate && this.delegate.createElement)
          node = this.delegate.createElement(nodeData.tagName);
        if (!node)
          node = doc.createElement(nodeData.tagName);

        Object.keys(nodeData.attributes).forEach((name) => {
          if (!this.delegate ||
              !this.delegate.setAttribute ||
              !this.delegate.setAttribute(node, name, nodeData.attributes[name])) {
            (<Element>node).setAttribute(name, nodeData.attributes[name]);
          }
        });

        break;
      default:
        throw "Unsupported node type: " + nodeData.nodeType;
    }

    this.idMap[nodeData.id] = node;

    if (parent)
      parent.appendChild(node);

    if (nodeData.childNodes) {
      for (let i = 0; i < nodeData.childNodes.length; i++)
        this.deserializeNode(nodeData.childNodes[i], <Element>node);
    }

    return node;
  }
}
