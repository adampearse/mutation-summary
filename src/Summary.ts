import {IStringMap} from "./IStringMap";
import {MutationProjection} from "./MutationProjection";
import {IQuery} from "./IQuery";

/**
 * Represents a set of changes made to the DOM.
 */
export class Summary {

  /**
   * All elements presently in the subtree and having the given attribute, but
   * that were not in the subtree, lacked the given attribute, or both.
   */
  public added: Node[];

  /**
   * All elements previously in the subtree and having the given attribute, but
   * that now are not in the subtree, lack the given attribute or both
   */
  public removed: Node[];

  /**
   * All nodes that were moved from one parent to another.
   */
  public reparented: Node[];

  /**
   * All nodes that are still in the subtree and still have their same
   * parent, but that have been reordered within the child list of their
   * parent.
   */
  public reordered: Node[];

  /**
   * All elements previously and presently in the subtree and previously and
   * presently having the given attribute, for whom the value of the given
   * attribute change.
   */
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

  /**
   * Will retrieve the previous parentNode for and node. The node must be
   * contained in the removed element array, otherwise the function throws an
   * error.
   *
   * @param node The node to get the previous parent for.
   */
  getOldParentNode(node: Node): Node {
    return this.projection.getOldParentNode(node);
  }

  /**
   * Retrieves the previous value of an attribute for an element. The Element
   * must be contained in the valueChanged element array, otherwise the
   * function throws an error.
   *
   * @param element The element to ge the old value for.
   * @param name The name off the attribute on the element to get the old value
   * for.
   */
  getOldAttribute(element: Element, name: string): string {
    return this.projection.getOldAttribute(element, name);
  }

  getOldCharacterData(node: Node): string {
    return this.projection.getOldCharacterData(node);
  }

  getOldPreviousSibling(node: Node): Node {
    return this.projection.getOldPreviousSibling(node);
  }
}