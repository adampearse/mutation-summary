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
import {assert} from "chai";

export function compareNodeArrayIgnoreOrder(expected: Node[], actual: Node[]) {
  assert.sameMembers(actual, expected);
}

export function registerValidator() {
  MutationSummary.createQueryValidator = function (root, query) {
    if (query.all) {
      const allFilter = (node) => {
        return typeof node.appendChild == 'function';
      }

      const allData = (node) => {
        var oldPreviousSiblingMap = new NodeMap();

        for (var child = node.firstChild; child; child = child.nextSibling)
          oldPreviousSiblingMap.set(child, child.previousSibling);

        return oldPreviousSiblingMap;
      }

      const allValidator = (summary, stayed, old, current) => {
        summary.reordered.forEach(function (node) {
          var oldPreviousSiblingMap = old.get(summary.getOldParentNode(node));
          assert.strictEqual(oldPreviousSiblingMap.get(node), summary.getOldPreviousSibling(node));
        });
      }

      return new Validator(root, allFilter, allData, allValidator);
    }

    if (query.characterData) {
      const textNodeFilter = (node) => {
        return node.nodeType == Node.TEXT_NODE || node.nodeType == Node.COMMENT_NODE;
      }

      const textNodeData = (node) => {
        return node.textContent;
      }

      const textNodeValidator = (summary, stayed, old, current) => {
        var changed = stayed.filter(function (node) {
          return old.get(node) != current.get(node);
        });

        compareNodeArrayIgnoreOrder(changed, summary.valueChanged);

        changed.forEach(function (node) {
          assert.strictEqual(old.get(node), summary.getOldCharacterData(node));
        });
      }

      return new Validator(root, textNodeFilter, textNodeData, textNodeValidator);
    }

    if (query.attribute) {
      const attributeFilter = (node) => {
        return node.nodeType == Node.ELEMENT_NODE && node.hasAttribute(query.attribute);
      }

      const attributeData = (node) => {
        return node.getAttribute(query.attribute);
      }

      const attributeValidator = (summary, stayed, old, current) => {
        var changed = stayed.filter(function (node) {
          return old.get(node) != current.get(node);
        });

        compareNodeArrayIgnoreOrder(changed, summary.valueChanged);

        changed.forEach(function (node) {
          assert.strictEqual(old.get(node), summary.getOldAttribute(node, query.attribute));
        });
      }

      return new Validator(root, attributeFilter, attributeData, attributeValidator);
    }

    if (query.element) {
      const elementFilter = (node) => {
        if (node.nodeType != Node.ELEMENT_NODE)
          return false;
        return query.elementFilter.some(function (pattern) {
          return node.matches(pattern.selectorString);
        });
      }

      const elementData = (node) => {

        var caseInsensitive = node instanceof HTMLElement &&
            node.ownerDocument instanceof HTMLDocument;

        var data = {
          parentNode: node.parentNode
        } as any;

        if (!query.elementAttributes)
          return data;

        data.attributes = {};
        (query.elementAttributes as any).forEach((attrName) => {
          data.attributes[attrName] = node.getAttribute(attrName);
        });

        return data;
      }

      const elementValidator = (summary, stayed, old, current) => {
        var attributeChanged = {};
        if (query.elementAttributes) {
          (query.elementAttributes as any).forEach(function(attrName) {
            attributeChanged[attrName] = [];
          });
        }
        var reparented = [];

        stayed.forEach(function (node) {
          var oldData = old.get(node);
          var data = current.get(node);

          if (oldData.parentNode != data.parentNode)
            reparented.push(node);

          if (!query.elementAttributes)
            return;

          (query.elementAttributes as any).forEach(function(attrName) {
            if (oldData.attributes[attrName] != data.attributes[attrName])
              attributeChanged[attrName].push(node);
          });
        });

        compareNodeArrayIgnoreOrder(reparented, summary.reparented);
        if (!query.elementAttributes)
          return;

        Object.keys(summary.attributeChanged).forEach(function (attrName) {
          compareNodeArrayIgnoreOrder(attributeChanged[attrName],
              summary.attributeChanged[attrName]);

          attributeChanged[attrName].forEach(function (node) {
            node(old.get(node).attributes[attrName], summary.getOldAttribute(node, attrName));
          });
        });

        const checkOldParentNode = (node) => {
          assert.strictEqual(old.get(node).parentNode, summary.getOldParentNode(node));
        }

        summary.removed.forEach(checkOldParentNode);
        summary.reparented.forEach(checkOldParentNode);
      }

      return new Validator(root, elementFilter, elementData, elementValidator);
    }
  }
}

class Validator {
  public root: any;
  public includeFunc: any;
  public dataFunc: any;
  public validateFunc: any;
  public current: any;

  constructor(root, includeFunc, dataFunc, validateFunc) {
    this.root = root;
    this.includeFunc = includeFunc;
    this.dataFunc = dataFunc;
    this.validateFunc = validateFunc;
  }

  collectNodeMap(node, includeFunc, dataFunc, map?) {
    map = map || new NodeMap;
    if (includeFunc(node))
      map.set(node, dataFunc(node));

    if (!node.childNodes || !node.childNodes.length)
      return map;

    for (var i = 0; i < node.childNodes.length; i++)
      this.collectNodeMap(node.childNodes[i], includeFunc, dataFunc, map);

    return map;
  }

  recordPreviousState() {
    this.current = this.collectNodeMap(this.root, this.includeFunc, this.dataFunc)
  };

  validate(summary) {
    var old = this.current;
    this.current = this.collectNodeMap(this.root, this.includeFunc, this.dataFunc);

    var currentCopy = new NodeMap;
    this.current.keys().forEach(function (node) {
      currentCopy.set(node, this.current.get(node));
    }, this);

    var stayed = [];
    var removed = [];
    old.keys().forEach(function (node) {
      if (currentCopy.has(node))
        stayed.push(node);
      else
        removed.push(node);

      currentCopy.delete(node);
    });

    var added = currentCopy.keys();

    compareNodeArrayIgnoreOrder(added, summary.added);
    compareNodeArrayIgnoreOrder(removed, summary.removed);

    this.validateFunc(summary, stayed, old, this.current);
  }
}
