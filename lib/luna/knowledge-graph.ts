export type KnowledgeNode = { id: string; type: string; label: string; properties?: Record<string, unknown> };
export type KnowledgeEdge = { from: string; to: string; relation: string };
export type KnowledgeGraph = { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };

export function addNode(graph: KnowledgeGraph, node: KnowledgeNode): KnowledgeGraph { return { ...graph, nodes: [...graph.nodes, node] }; }
export function addEdge(graph: KnowledgeGraph, edge: KnowledgeEdge): KnowledgeGraph {
  if (!graph.nodes.some((n) => n.id === edge.from) || !graph.nodes.some((n) => n.id === edge.to)) throw new Error("Knowledge edge references an unknown node");
  return { ...graph, edges: [...graph.edges, edge] };
}
