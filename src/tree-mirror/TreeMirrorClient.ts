import {MutationSummary} from "../MutationSummary";
import {NodeMap} from "../NodeMap";
import {IQuery} from "../IQuery";
import {INodeData} from "./INodeData";
import {Summary} from "../Summary";
import {IPositionData} from "./IPositionData";
import {IStringMap} from "../IStringMap";
import {IAttributeData} from "./IAttributeData";
import {ITextData} from "./ITextData";

export class TreeMirrorClient {
  private nextId: number;

  private mutationSummary: MutationSummary;
  private knownNodes: NodeMap<number>;

  constructor(public target: Node, public mirror: any, testingQueries: IQuery[]) {
    this.nextId = 1;
    this.knownNodes = new NodeMap<number>();

    const rootId = this.serializeNode(target).id;
    const children: INodeData[] = [];
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

  private serializeNode(node: Node, recursive?: boolean): INodeData {
    if (node === null)
      return null;

    const id = this.knownNodes.get(node);
    if (id !== undefined) {
      return {id: id};
    }

    const data: INodeData = {
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
                                 reordered: Node[]): IPositionData[] {
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

    const moved: IPositionData[] = [];

    parentMap.keys().forEach((parent) => {
      const children = parentMap.get(parent);

      let keys = children.keys();
      while (keys.length) {
        let node = keys[0];
        while (node.previousSibling && children.has(node.previousSibling))
          node = node.previousSibling;

        while (node && children.has(node)) {
          const data = <IPositionData>this.serializeNode(node);
          data.previousSibling = this.serializeNode(node.previousSibling);
          data.parentNode = this.serializeNode(node.parentNode);
          moved.push(<IPositionData>data);
          children.delete(node);
          node = node.nextSibling;
        }

        keys = children.keys();
      }
    });

    return moved;
  }

  private serializeAttributeChanges(attributeChanged: IStringMap<Element[]>): IAttributeData[] {
    const map = new NodeMap<IAttributeData>();

    Object.keys(attributeChanged).forEach((attrName) => {
      attributeChanged[attrName].forEach((element) => {
        let record = map.get(element);
        if (!record) {
          record = <IAttributeData>this.serializeNode(element);
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

    const removed: INodeData[] = summary.removed.map((node: Node) => {
      return this.serializeNode(node);
    });

    const moved: IPositionData[] =
        this.serializeAddedAndMoved(summary.added,
            summary.reparented,
            summary.reordered);

    const attributes: IAttributeData[] =
        this.serializeAttributeChanges(summary.attributeChanged);

    const text: ITextData[] = summary.characterDataChanged.map((node: Node) => {
      const data = this.serializeNode(node);
      data.textContent = node.textContent;
      return <ITextData>data;
    });

    this.mirror.applyChanged(removed, moved, attributes, text);

    summary.removed.forEach((node: Node) => {
      this.forgetNode(node);
    });
  }
}