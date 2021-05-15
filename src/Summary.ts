import {IStringMap} from "./IStringMap";
import {MutationProjection} from "./MutationProjection";
import {IQuery} from "./IQuery";

export class Summary {
  public added: Node[];
  public removed: Node[];
  public reparented: Node[];
  public reordered: Node[];
  public valueChanged: Node[];
  public attributeChanged: IStringMap<Element[]>;
  public characterDataChanged: Node[];

  constructor(private projection: MutationProjection, query: IQuery) {
    this.added = [];
    this.removed = [];
    this.reparented = query.all || query.element || query.characterData ? [] : undefined;
    this.reordered = query.all ? [] : undefined;

    projection.getChanged(this, query.elementFilter, query.characterData);

    if (query.all || query.attribute || query.attributeList) {
      const filter = query.attribute ? [query.attribute] : query.attributeList;
      let attributeChanged = projection.attributeChangedNodes(filter);

      if (query.attribute) {
        this.valueChanged = attributeChanged[query.attribute] || [];
      } else {
        this.attributeChanged = attributeChanged;
        if (query.attributeList) {
          query.attributeList.forEach((attrName) => {
            if (!this.attributeChanged.hasOwnProperty(attrName))
              this.attributeChanged[attrName] = [];
          });
        }
      }
    }

    if (query.all || query.characterData) {
      const characterDataChanged = projection.getCharacterDataChanged()

      if (query.characterData)
        this.valueChanged = characterDataChanged;
      else
        this.characterDataChanged = characterDataChanged;
    }

    if (this.reordered)
      this.getOldPreviousSibling = projection.getOldPreviousSibling.bind(projection);
  }

  getOldParentNode(node: Node): Node {
    return this.projection.getOldParentNode(node);
  }

  getOldAttribute(node: Node, name: string): string {
    return this.projection.getOldAttribute(node, name);
  }

  getOldCharacterData(node: Node): string {
    return this.projection.getOldCharacterData(node);
  }

  getOldPreviousSibling(node: Node): Node {
    return this.projection.getOldPreviousSibling(node);
  }
}