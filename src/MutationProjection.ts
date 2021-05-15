import {TreeChanges} from "./TreeChanges";
import {NodeMap} from "./NodeMap";
import {Movement} from "./Movement";
import {ChildListChange} from "./ChildListChange";
import {INumberMap} from "./INumberMap";
import {IStringMap} from "./IStringMap";
import {Summary} from "./Summary";
import {Selector} from "./Selector";

export class MutationProjection {

  private treeChanges: TreeChanges;
  private entered: Node[];
  private exited: Node[];
  private stayedIn: NodeMap<Movement>;
  private visited: NodeMap<boolean>;
  private childListChangeMap: NodeMap<ChildListChange>;
  private characterDataOnly: boolean;
  private matchCache: INumberMap<NodeMap<Movement>>;

  // TOOD(any)
  constructor(public rootNode: Node,
              public mutations: MutationRecord[],
              public selectors: Selector[],
              public calcReordered: boolean,
              public calcOldPreviousSibling: boolean) {

    this.treeChanges = new TreeChanges(rootNode, mutations);
    this.entered = [];
    this.exited = [];
    this.stayedIn = new NodeMap<Movement>();
    this.visited = new NodeMap<boolean>();
    this.childListChangeMap = undefined;
    this.characterDataOnly = undefined;
    this.matchCache = undefined;

    this.processMutations();
  }

  processMutations() {
    if (!this.treeChanges.anyParentsChanged &&
        !this.treeChanges.anyAttributesChanged)
      return;

    var changedNodes: Node[] = this.treeChanges.keys();
    for (var i = 0; i < changedNodes.length; i++) {
      this.visitNode(changedNodes[i], undefined);
    }
  }

  visitNode(node: Node, parentReachable: Movement) {
    if (this.visited.has(node))
      return;

    this.visited.set(node, true);

    var change = this.treeChanges.get(node);
    var reachable = parentReachable;

    // node inherits its parent's reachability change unless
    // its parentNode was mutated.
    if ((change && change.childList) || reachable == undefined)
      reachable = this.treeChanges.reachabilityChange(node);

    if (reachable === Movement.STAYED_OUT)
      return;

    // Cache match results for sub-patterns.
    this.matchabilityChange(node);

    if (reachable === Movement.ENTERED) {
      this.entered.push(node);
    } else if (reachable === Movement.EXITED) {
      this.exited.push(node);
      this.ensureHasOldPreviousSiblingIfNeeded(node);

    } else if (reachable === Movement.STAYED_IN) {
      var movement = Movement.STAYED_IN;

      if (change && change.childList) {
        if (change.oldParentNode !== node.parentNode) {
          movement = Movement.REPARENTED;
          this.ensureHasOldPreviousSiblingIfNeeded(node);
        } else if (this.calcReordered && this.wasReordered(node)) {
          movement = Movement.REORDERED;
        }
      }

      this.stayedIn.set(node, movement);
    }

    if (reachable === Movement.STAYED_IN)
      return;

    // reachable === ENTERED || reachable === EXITED.
    for (var child = node.firstChild; child; child = child.nextSibling) {
      this.visitNode(child, reachable);
    }
  }

  ensureHasOldPreviousSiblingIfNeeded(node: Node) {
    if (!this.calcOldPreviousSibling)
      return;

    this.processChildlistChanges();

    var parentNode = node.parentNode as Node;
    var nodeChange = this.treeChanges.get(node);
    if (nodeChange && nodeChange.oldParentNode)
      parentNode = nodeChange.oldParentNode;

    var change = this.childListChangeMap.get(parentNode);
    if (!change) {
      change = new ChildListChange();
      this.childListChangeMap.set(parentNode, change);
    }

    if (!change.oldPrevious.has(node)) {
      change.oldPrevious.set(node, node.previousSibling);
    }
  }

  getChanged(summary: Summary, selectors: Selector[], characterDataOnly: boolean) {
    this.selectors = selectors;
    this.characterDataOnly = characterDataOnly;

    for (var i = 0; i < this.entered.length; i++) {
      var node = this.entered[i];
      var matchable = this.matchabilityChange(node);
      if (matchable === Movement.ENTERED || matchable === Movement.STAYED_IN)
        summary.added.push(node);
    }

    var stayedInNodes = this.stayedIn.keys();
    for (var i = 0; i < stayedInNodes.length; i++) {
      var node = stayedInNodes[i];
      var matchable = this.matchabilityChange(node);

      if (matchable === Movement.ENTERED) {
        summary.added.push(node);
      } else if (matchable === Movement.EXITED) {
        summary.removed.push(node);
      } else if (matchable === Movement.STAYED_IN && (summary.reparented || summary.reordered)) {
        var movement: Movement = this.stayedIn.get(node);
        if (summary.reparented && movement === Movement.REPARENTED)
          summary.reparented.push(node);
        else if (summary.reordered && movement === Movement.REORDERED)
          summary.reordered.push(node);
      }
    }

    for (var i = 0; i < this.exited.length; i++) {
      var node = this.exited[i];
      var matchable = this.matchabilityChange(node);
      if (matchable === Movement.EXITED || matchable === Movement.STAYED_IN)
        summary.removed.push(node);
    }
  }

  getOldParentNode(node: Node): Node {
    var change = this.treeChanges.get(node);
    if (change && change.childList)
      return change.oldParentNode ? change.oldParentNode : null;

    var reachabilityChange = this.treeChanges.reachabilityChange(node);
    if (reachabilityChange === Movement.STAYED_OUT || reachabilityChange === Movement.ENTERED)
      throw Error('getOldParentNode requested on invalid node.');

    return node.parentNode;
  }

  getOldPreviousSibling(node: Node): Node {
    var parentNode = node.parentNode as Node;
    var nodeChange = this.treeChanges.get(node);
    if (nodeChange && nodeChange.oldParentNode)
      parentNode = nodeChange.oldParentNode;

    var change = this.childListChangeMap.get(parentNode);
    if (!change)
      throw Error('getOldPreviousSibling requested on invalid node.');

    return change.oldPrevious.get(node);
  }

  getOldAttribute(element: Node, attrName: string): string {
    var change = this.treeChanges.get(element);
    if (!change || !change.attributes)
      throw Error('getOldAttribute requested on invalid node.');

    var value = change.getAttributeOldValue(attrName);
    if (value === undefined)
      throw Error('getOldAttribute requested for unchanged attribute name.');

    return value;
  }

  attributeChangedNodes(includeAttributes: string[]): IStringMap<Element[]> {
    if (!this.treeChanges.anyAttributesChanged)
      return {}; // No attributes mutations occurred.

    var attributeFilter: IStringMap<boolean>;
    var caseInsensitiveFilter: IStringMap<string>;
    if (includeAttributes) {
      attributeFilter = {};
      caseInsensitiveFilter = {};
      for (var i = 0; i < includeAttributes.length; i++) {
        var attrName: string = includeAttributes[i];
        attributeFilter[attrName] = true;
        caseInsensitiveFilter[attrName.toLowerCase()] = attrName;
      }
    }

    var result: IStringMap<Element[]> = {};
    var nodes = this.treeChanges.keys();

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      var change = this.treeChanges.get(node);
      if (!change.attributes)
        continue;

      if (Movement.STAYED_IN !== this.treeChanges.reachabilityChange(node) ||
          Movement.STAYED_IN !== this.matchabilityChange(node)) {
        continue;
      }

      var element = <Element>node;
      var changedAttrNames = change.getAttributeNamesMutated();
      for (var j = 0; j < changedAttrNames.length; j++) {
        var attrName = changedAttrNames[j];

        if (attributeFilter &&
            !attributeFilter[attrName] &&
            !(change.isCaseInsensitive && caseInsensitiveFilter[attrName])) {
          continue;
        }

        var oldValue = change.getAttributeOldValue(attrName);
        if (oldValue === element.getAttribute(attrName))
          continue;

        if (caseInsensitiveFilter && change.isCaseInsensitive)
          attrName = caseInsensitiveFilter[attrName];

        result[attrName] = result[attrName] || [];
        result[attrName].push(element);
      }
    }

    return result;
  }

  getOldCharacterData(node: Node): string {
    var change = this.treeChanges.get(node);
    if (!change || !change.characterData)
      throw Error('getOldCharacterData requested on invalid node.');

    return change.characterDataOldValue;
  }

  getCharacterDataChanged(): Node[] {
    if (!this.treeChanges.anyCharacterDataChanged)
      return []; // No characterData mutations occurred.

    var nodes = this.treeChanges.keys();
    var result: Node[] = [];
    for (var i = 0; i < nodes.length; i++) {
      var target = nodes[i];
      if (Movement.STAYED_IN !== this.treeChanges.reachabilityChange(target))
        continue;

      var change = this.treeChanges.get(target);
      if (!change.characterData ||
          target.textContent == change.characterDataOldValue)
        continue

      result.push(target);
    }

    return result;
  }

  computeMatchabilityChange(selector: Selector, el: Element): Movement {
    if (!this.matchCache)
      this.matchCache = [];
    if (!this.matchCache[selector.uid])
      this.matchCache[selector.uid] = new NodeMap<Movement>();

    var cache = this.matchCache[selector.uid];
    var result = cache.get(el);
    if (result === undefined) {
      result = selector.matchabilityChange(el, this.treeChanges.get(el));
      cache.set(el, result);
    }
    return result;
  }

  matchabilityChange(node: Node): Movement {
    // TODO(rafaelw): Include PI, CDATA?
    // Only include text nodes.
    if (this.characterDataOnly) {
      switch (node.nodeType) {
        case Node.COMMENT_NODE:
        case Node.TEXT_NODE:
          return Movement.STAYED_IN;
        default:
          return Movement.STAYED_OUT;
      }
    }

    // No element filter. Include all nodes.
    if (!this.selectors)
      return Movement.STAYED_IN;

    // Element filter. Exclude non-elements.
    if (node.nodeType !== Node.ELEMENT_NODE)
      return Movement.STAYED_OUT;

    var el = <Element>node;

    var matchChanges = this.selectors.map((selector: Selector) => {
      return this.computeMatchabilityChange(selector, el);
    });

    var accum: Movement = Movement.STAYED_OUT;
    var i = 0;

    while (accum !== Movement.STAYED_IN && i < matchChanges.length) {
      switch (matchChanges[i]) {
        case Movement.STAYED_IN:
          accum = Movement.STAYED_IN;
          break;
        case Movement.ENTERED:
          if (accum === Movement.EXITED)
            accum = Movement.STAYED_IN;
          else
            accum = Movement.ENTERED;
          break;
        case Movement.EXITED:
          if (accum === Movement.ENTERED)
            accum = Movement.STAYED_IN;
          else
            accum = Movement.EXITED;
          break;
      }

      i++;
    }

    return accum;
  }

  getChildlistChange(el: Element): ChildListChange {
    var change = this.childListChangeMap.get(el);
    if (!change) {
      change = new ChildListChange();
      this.childListChangeMap.set(el, change);
    }

    return change;
  }

  processChildlistChanges() {
    if (this.childListChangeMap)
      return;

    this.childListChangeMap = new NodeMap<ChildListChange>();

    for (var i = 0; i < this.mutations.length; i++) {
      var mutation = this.mutations[i];
      if (mutation.type != 'childList')
        continue;

      if (this.treeChanges.reachabilityChange(mutation.target) !== Movement.STAYED_IN &&
          !this.calcOldPreviousSibling)
        continue;

      var change = this.getChildlistChange(<Element>mutation.target);

      var oldPrevious = mutation.previousSibling;

      const recordOldPrevious = (node: Node, previous: Node) => {
        if (!node ||
            change.oldPrevious.has(node) ||
            change.added.has(node) ||
            change.maybeMoved.has(node))
          return;

        if (previous &&
            (change.added.has(previous) ||
                change.maybeMoved.has(previous)))
          return;

        change.oldPrevious.set(node, previous);
      }

      for (var j = 0; j < mutation.removedNodes.length; j++) {
        var node = mutation.removedNodes[j];
        recordOldPrevious(node, oldPrevious);

        if (change.added.has(node)) {
          change.added.delete(node);
        } else {
          change.removed.set(node, true);
          change.maybeMoved.delete(node);
        }

        oldPrevious = node;
      }

      recordOldPrevious(mutation.nextSibling, oldPrevious);

      for (var j = 0; j < mutation.addedNodes.length; j++) {
        var node = mutation.addedNodes[j];
        if (change.removed.has(node)) {
          change.removed.delete(node);
          change.maybeMoved.set(node, true);
        } else {
          change.added.set(node, true);
        }
      }
    }
  }

  wasReordered(node: Node) {
    if (!this.treeChanges.anyParentsChanged)
      return false;

    this.processChildlistChanges();

    var parentNode = node.parentNode as Node;
    var nodeChange = this.treeChanges.get(node);
    if (nodeChange && nodeChange.oldParentNode)
      parentNode = nodeChange.oldParentNode;

    var change = this.childListChangeMap.get(parentNode);
    if (!change)
      return false;

    if (change.moved)
      return change.moved.get(node);

    change.moved = new NodeMap<boolean>();
    var pendingMoveDecision = new NodeMap<boolean>();

    function isMoved(node: Node) {
      if (!node)
        return false;
      if (!change.maybeMoved.has(node))
        return false;

      var didMove = change.moved.get(node);
      if (didMove !== undefined)
        return didMove;

      if (pendingMoveDecision.has(node)) {
        didMove = true;
      } else {
        pendingMoveDecision.set(node, true);
        didMove = getPrevious(node) !== getOldPrevious(node);
      }

      if (pendingMoveDecision.has(node)) {
        pendingMoveDecision.delete(node);
        change.moved.set(node, didMove);
      } else {
        didMove = change.moved.get(node);
      }

      return didMove;
    }

    var oldPreviousCache = new NodeMap<Node>();

    function getOldPrevious(node: Node): Node {
      var oldPrevious = oldPreviousCache.get(node);
      if (oldPrevious !== undefined)
        return oldPrevious;

      oldPrevious = change.oldPrevious.get(node);
      while (oldPrevious &&
      (change.removed.has(oldPrevious) || isMoved(oldPrevious))) {
        oldPrevious = getOldPrevious(oldPrevious);
      }

      if (oldPrevious === undefined)
        oldPrevious = node.previousSibling;
      oldPreviousCache.set(node, oldPrevious);

      return oldPrevious;
    }

    var previousCache = new NodeMap<Node>();

    function getPrevious(node: Node): Node {
      if (previousCache.has(node))
        return previousCache.get(node);

      var previous = node.previousSibling;
      while (previous && (change.added.has(previous) || isMoved(previous)))
        previous = previous.previousSibling;

      previousCache.set(node, previous);
      return previous;
    }

    change.maybeMoved.keys().forEach(isMoved);
    return change.moved.get(node);
  }
}