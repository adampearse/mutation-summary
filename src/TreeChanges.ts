import {NodeMap} from "./NodeMap";
import {NodeChange} from "./NodeChange";
import {Movement} from "./Movement";

export class TreeChanges extends NodeMap<NodeChange> {

  public anyParentsChanged: boolean;
  public anyAttributesChanged: boolean;
  public anyCharacterDataChanged: boolean;

  private reachableCache: NodeMap<boolean>;
  private wasReachableCache: NodeMap<boolean>;

  private rootNode: Node;

  constructor(rootNode: Node, mutations: MutationRecord[]) {
    super();

    this.rootNode = rootNode;
    this.reachableCache = undefined;
    this.wasReachableCache = undefined;
    this.anyParentsChanged = false;
    this.anyAttributesChanged = false;
    this.anyCharacterDataChanged = false;

    for (var m = 0; m < mutations.length; m++) {
      var mutation = mutations[m];
      switch (mutation.type) {

        case 'childList':
          this.anyParentsChanged = true;
          for (var i = 0; i < mutation.removedNodes.length; i++) {
            var node = mutation.removedNodes[i];
            this.getChange(node).removedFromParent(mutation.target);
          }
          for (var i = 0; i < mutation.addedNodes.length; i++) {
            var node = mutation.addedNodes[i];
            this.getChange(node).insertedIntoParent();
          }
          break;

        case 'attributes':
          this.anyAttributesChanged = true;
          var change = this.getChange(mutation.target);
          change.attributeMutated(mutation.attributeName, mutation.oldValue);
          break;

        case 'characterData':
          this.anyCharacterDataChanged = true;
          var change = this.getChange(mutation.target);
          change.characterDataMutated(mutation.oldValue);
          break;
      }
    }
  }

  getChange(node: Node): NodeChange {
    var change = this.get(node);
    if (!change) {
      change = new NodeChange(node);
      this.set(node, change);
    }
    return change;
  }

  getOldParent(node: Node): Node {
    var change = this.get(node);
    return change ? change.getOldParent() : node.parentNode;
  }

  getIsReachable(node: Node): boolean {
    if (node === this.rootNode)
      return true;
    if (!node)
      return false;

    this.reachableCache = this.reachableCache || new NodeMap<boolean>();
    var isReachable = this.reachableCache.get(node);
    if (isReachable === undefined) {
      isReachable = this.getIsReachable(node.parentNode);
      this.reachableCache.set(node, isReachable);
    }
    return isReachable;
  }

  // A node wasReachable if its oldParent wasReachable.
  getWasReachable(node: Node): boolean {
    if (node === this.rootNode)
      return true;
    if (!node)
      return false;

    this.wasReachableCache = this.wasReachableCache || new NodeMap<boolean>();
    var wasReachable: boolean = this.wasReachableCache.get(node);
    if (wasReachable === undefined) {
      wasReachable = this.getWasReachable(this.getOldParent(node));
      this.wasReachableCache.set(node, wasReachable);
    }
    return wasReachable;
  }

  reachabilityChange(node: Node): Movement {
    if (this.getIsReachable(node)) {
      return this.getWasReachable(node) ?
          Movement.STAYED_IN : Movement.ENTERED;
    }

    return this.getWasReachable(node) ?
        Movement.EXITED : Movement.STAYED_OUT;
  }
}