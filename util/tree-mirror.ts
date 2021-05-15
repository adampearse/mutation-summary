///<reference path='../dist/types/index.d.ts'/>


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

import {MutationSummary} from "../src/MutationSummary";
import {NodeMap} from "../src/NodeMap";
import {IQuery} from "../src/IQuery";
import {Summary} from "../src/Summary";

export interface NodeData {
  id: number;
  nodeType?: number;
  name?: string;
  publicId?: string;
  systemId?: string;
  textContent?: string;
  tagName?: string;
  attributes?: MutationSummary.IStringMap<string>;
  childNodes?: NodeData[];
}

export interface PositionData extends NodeData {
  previousSibling: NodeData;
  parentNode: NodeData;
}

export interface AttributeData extends NodeData {
  attributes: MutationSummary.IStringMap<string>;
}

export interface TextData extends NodeData {
  textContent: string;
}

export class TreeMirror {

  private readonly idMap: MutationSummary.INumberMap<Node>;

  constructor(public root: Node, public delegate?: any) {
    this.idMap = {};
  }

  initialize(rootId: number, children: NodeData[]) {
    this.idMap[rootId] = this.root;

    for (let i = 0; i < children.length; i++)
      this.deserializeNode(children[i], <Element>this.root);
  }

  applyChanged(removed: NodeData[],
               addedOrMoved: PositionData[],
               attributes: AttributeData[],
               text: TextData[]) {

    // NOTE: Applying the changes can result in an attempting to add a child
    // to a parent which is presently an ancestor of the parent. This can occur
    // based on random ordering of moves. The way we handle this is to first
    // remove all changed nodes from their parents, then apply.
    addedOrMoved.forEach((data: PositionData) => {
      const node = this.deserializeNode(data);
      this.deserializeNode(data.parentNode);
      this.deserializeNode(data.previousSibling);
      if (node.parentNode)
        node.parentNode.removeChild(node);
    });

    removed.forEach((data: NodeData) => {
      const node = this.deserializeNode(data);
      if (node.parentNode)
        node.parentNode.removeChild(node);
    });

    addedOrMoved.forEach((data: PositionData) => {
      const node = this.deserializeNode(data);
      const parent = this.deserializeNode(data.parentNode);
      const previous = this.deserializeNode(data.previousSibling);
      parent.insertBefore(node,
          previous ? previous.nextSibling : parent.firstChild);
    });

    attributes.forEach((data: AttributeData) => {
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

    text.forEach((data: TextData) => {
      const node = this.deserializeNode(data);
      node.textContent = data.textContent;
    });

    removed.forEach((node: NodeData) => {
      delete this.idMap[node.id];
    });
  }

  private deserializeNode(nodeData: NodeData, parent?: Element): Node {
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

export class TreeMirrorClient {
  private nextId: number;

  private mutationSummary: MutationSummary;
  private knownNodes: NodeMap<number>;

  constructor(public target: Node, public mirror: any, testingQueries: IQuery[]) {
    this.nextId = 1;
    this.knownNodes = new NodeMap<number>();

    const rootId = this.serializeNode(target).id;
    const children: NodeData[] = [];
    for (let child = target.firstChild; child; child = child.nextSibling)
      children.push(this.serializeNode(child, true));

    this.mirror.initialize(rootId, children);

    let queries = [{all: true}] as IQuery[];

    if (testingQueries)
      queries = queries.concat(testingQueries);

    this.mutationSummary = new MutationSummary({
      rootNode: target,
      callback: (summaries: Summary[]) => {
        this.applyChanged(summaries);
      },
      queries: queries
    });
  }


  disconnect() {
    if (this.mutationSummary) {
      this.mutationSummary.disconnect();
      this.mutationSummary = undefined;
    }
  }

  private rememberNode(node: Node): number {
    const id = this.nextId++;
    this.knownNodes.set(node, id);
    return id;
  }

  private forgetNode(node: Node) {
    this.knownNodes.delete(node);
  }

  private serializeNode(node: Node, recursive?: boolean): NodeData {
    if (node === null)
      return null;

    const id = this.knownNodes.get(node);
    if (id !== undefined) {
      return {id: id};
    }

    const data: NodeData = {
      nodeType: node.nodeType,
      id: this.rememberNode(node)
    };

    switch (data.nodeType) {
      case Node.DOCUMENT_TYPE_NODE:
        const docType = <DocumentType>node;
        data.name = docType.name;
        data.publicId = docType.publicId;
        data.systemId = docType.systemId;
        break;

      case Node.COMMENT_NODE:
      case Node.TEXT_NODE:
        data.textContent = node.textContent;
        break;

      case Node.ELEMENT_NODE:
        const elm = <Element>node;
        data.tagName = elm.tagName;
        data.attributes = {};
        for (let i = 0; i < elm.attributes.length; i++) {
          const attr = elm.attributes[i];
          data.attributes[attr.name] = attr.value;
        }

        if (recursive && elm.childNodes.length) {
          data.childNodes = [];

          for (let child = elm.firstChild; child; child = child.nextSibling)
            data.childNodes.push(this.serializeNode(child, true));
        }
        break;
    }

    return data;
  }

  private serializeAddedAndMoved(added: Node[],
                                 reparented: Node[],
                                 reordered: Node[]): PositionData[] {
    const all = added.concat(reparented).concat(reordered);

    const parentMap = new NodeMap<NodeMap<boolean>>();

    all.forEach((node) => {
      const parent = node.parentNode;
      let children = parentMap.get(parent)
      if (!children) {
        children = new NodeMap<boolean>();
        parentMap.set(parent, children);
      }

      children.set(node, true);
    });

    const moved: PositionData[] = [];

    parentMap.keys().forEach((parent) => {
      const children = parentMap.get(parent);

      let keys = children.keys();
      while (keys.length) {
        let node = keys[0];
        while (node.previousSibling && children.has(node.previousSibling))
          node = node.previousSibling;

        while (node && children.has(node)) {
          const data = <PositionData>this.serializeNode(node);
          data.previousSibling = this.serializeNode(node.previousSibling);
          data.parentNode = this.serializeNode(node.parentNode);
          moved.push(<PositionData>data);
          children.delete(node);
          node = node.nextSibling;
        }

        keys = children.keys();
      }
    });

    return moved;
  }

  private serializeAttributeChanges(attributeChanged: MutationSummary.IStringMap<Element[]>): AttributeData[] {
    const map = new NodeMap<AttributeData>();

    Object.keys(attributeChanged).forEach((attrName) => {
      attributeChanged[attrName].forEach((element) => {
        let record = map.get(element);
        if (!record) {
          record = <AttributeData>this.serializeNode(element);
          record.attributes = {};
          map.set(element, record);
        }

        record.attributes[attrName] = element.getAttribute(attrName);
      });
    });

    return map.keys().map((node: Node) => {
      return map.get(node);
    });
  }

  applyChanged(summaries: Summary[]) {
    const summary: Summary = summaries[0]

    const removed: NodeData[] = summary.removed.map((node: Node) => {
      return this.serializeNode(node);
    });

    const moved: PositionData[] =
        this.serializeAddedAndMoved(summary.added,
            summary.reparented,
            summary.reordered);

    const attributes: AttributeData[] =
        this.serializeAttributeChanges(summary.attributeChanged);

    const text: TextData[] = summary.characterDataChanged.map((node: Node) => {
      const data = this.serializeNode(node);
      data.textContent = node.textContent;
      return <TextData>data;
    });

    this.mirror.applyChanged(removed, moved, attributes, text);

    summary.removed.forEach((node: Node) => {
      this.forgetNode(node);
    });
  }
}
