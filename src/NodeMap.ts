export class NodeMap<T> {

  private static ID_PROP = '__mutation_summary_node_map_id__';
  private static nextId_: number = 1;

  private nodes: Node[];
  private values: T[];

  constructor() {
    this.nodes = [];
    this.values = [];
  }

  private isIndex(s: string): boolean {
    return +s === <any>s >>> 0;
  }

  private nodeId(node: Node) {
    var id = node[NodeMap.ID_PROP];
    if (!id)
      id = node[NodeMap.ID_PROP] = NodeMap.nextId_++;
    return id;
  }

  set(node: Node, value: T) {
    var id = this.nodeId(node);
    this.nodes[id] = node;
    this.values[id] = value;
  }

  get(node: Node): T {
    var id = this.nodeId(node);
    return this.values[id];
  }

  has(node: Node): boolean {
    return this.nodeId(node) in this.nodes;
  }

  delete(node: Node) {
    var id = this.nodeId(node);
    delete this.nodes[id];
    this.values[id] = undefined;
  }

  keys(): Node[] {
    var nodes: Node[] = [];
    for (var id in this.nodes) {
      if (!this.isIndex(id))
        continue;
      nodes.push(this.nodes[id]);
    }

    return nodes;
  }
}