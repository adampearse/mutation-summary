/**
 * A helper class that maps from a DOM Node to an arbitrary value.
 */
export class NodeMap<T> {

  private static _ID_PROP = '__mutation_summary_node_map_id__';
  private static _NEXT_ID: number = 1;

  private static _isIndex(s: string): boolean {
    return +s === <any>s >>> 0;
  }

  private static _nodeId(node: Node) {
    let id = node[NodeMap._ID_PROP];
    if (!id)
      id = node[NodeMap._ID_PROP] = NodeMap._NEXT_ID++;
    return id;
  }

  private readonly _nodes: Node[];
  private readonly _values: T[];

  /**
   * Constructs a new and empty NodeMap.
   */
  constructor() {
    this._nodes = [];
    this._values = [];
  }

  /**
   * Sets the value of a node within the map.
   * @param node  The node to set the value for.
   * @param value the value to associate with the node.
   */
  set(node: Node, value: T) {
    const id = NodeMap._nodeId(node);
    this._nodes[id] = node;
    this._values[id] = value;
  }

  /**
   * Gets the value for the given node.
   *
   * @param node The node to get the value of.
   * @returns The value for the given node, or undefined if the node is not
   * present in the map.
   */
  get(node: Node): T | undefined {
    const id = NodeMap._nodeId(node);
    return id !== undefined ? this._values[id] : undefined;
  }

  /**
   * Determines if a given node is in the NodeMap.
   *
   * @param node The node to determine if it is in the map.
   *
   * @returns true if the Node is contained in the map, false otherwise.
   */
  has(node: Node): boolean {
    return NodeMap._nodeId(node) in this._nodes;
  }

  /**
   * Deletes a node from the NodeMap.
   *
   * @param node The node to delete.
   */
  delete(node: Node) {
    const id = NodeMap._nodeId(node);
    delete this._nodes[id];
    this._values[id] = undefined;
  }

  /**
   * @returns an array that holds the nodes that are the keys of the map.
   */
  keys(): Node[] {
    const nodes: Node[] = [];
    for (let id in this._nodes) {
      if (!NodeMap._isIndex(id))
        continue;
      nodes.push(this._nodes[id]);
    }

    return nodes;
  }
}
