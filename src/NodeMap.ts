export class NodeMap<T> {

  private static ID_PROP = '__mutation_summary_node_map_id__';
  private static nextId_: number = 1;

  private readonly nodes: Node[];
  private readonly values: T[];

  constructor() {
    this.nodes = [];
    this.values = [];
  }

  private static isIndex(s: string): boolean {
    return +s === <any>s >>> 0;
  }

  private static nodeId(node: Node) {
    let id = node[NodeMap.ID_PROP];
    if (!id)
      id = node[NodeMap.ID_PROP] = NodeMap.nextId_++;
    return id;
  }

  set(node: Node, value: T) {
    const id = NodeMap.nodeId(node);
    this.nodes[id] = node;
    this.values[id] = value;
  }

  get(node: Node): T {
    const id = NodeMap.nodeId(node);
    return this.values[id];
  }

  has(node: Node): boolean {
    return NodeMap.nodeId(node) in this.nodes;
  }

  delete(node: Node) {
    const id = NodeMap.nodeId(node);
    delete this.nodes[id];
    this.values[id] = undefined;
  }

  keys(): Node[] {
    const nodes: Node[] = [];
    for (let id in this.nodes) {
      if (!NodeMap.isIndex(id))
        continue;
      nodes.push(this.nodes[id]);
    }

    return nodes;
  }
}