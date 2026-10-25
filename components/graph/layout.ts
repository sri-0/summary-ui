import type { TopicGraph } from "@/lib/api/types";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";

/** A topic node's width scales with its count between these; its height is fixed. */
export const NODE_MIN_W = 120;
export const NODE_MAX_W = 220;
export const NODE_H = 56;

/** A laid-out node: a topic's position is relative to its cluster, a cluster's to the canvas. */
export type Positioned = { id: string; x: number; y: number; width: number; height: number; parent?: string };
export type LayoutResult = { nodes: Positioned[]; clusters: Positioned[] };

/** The id of a cluster's node on the canvas, distinct from any topic's id. */
export const clusterNodeId = (id: string) => `cluster:${id}`;

const elk = new ELK();

/** Lays the graph out in two levels: each cluster is a compound node whose
 *  topics are layered left to right by the edges among them (every kind, so
 *  switching the drawn kind moves nothing), and the clusters are packed into
 *  a canvas near the screen's shape. Edges between clusters are drawn but do
 *  not place anything: the clustering already says what belongs together. */
export async function layoutGraph(g: TopicGraph): Promise<LayoutResult> {
  const counts = g.nodes.map((n) => n.count);
  const min = Math.min(...counts);
  const span = Math.max(...counts) - min || 1;
  const clusterOf = new Map(g.nodes.map((n) => [n.id, n.cluster_id]));
  const clusters = new Map<string, ElkNode>();
  for (const n of g.nodes) {
    const cluster =
      clusters.get(n.cluster_id) ??
      clusters
        .set(n.cluster_id, {
          id: clusterNodeId(n.cluster_id),
          children: [],
          edges: [],
          layoutOptions: {
            "elk.algorithm": "layered",
            "elk.direction": "RIGHT",
            "elk.padding": "[top=44,left=16,bottom=16,right=16]",
            "elk.layered.spacing.nodeNodeBetweenLayers": "40",
            "elk.spacing.nodeNode": "16",
          },
        })
        .get(n.cluster_id)!;
    cluster.children!.push({ id: n.id, width: Math.round(NODE_MIN_W + ((NODE_MAX_W - NODE_MIN_W) * (n.count - min)) / span), height: NODE_H });
  }
  for (const e of g.edges) {
    const c = clusterOf.get(e.source);
    if (c !== undefined && c === clusterOf.get(e.target)) clusters.get(c)!.edges!.push({ id: `${e.kind}:${e.source}>${e.target}`, sources: [e.source], targets: [e.target] });
  }
  const out = await elk.layout({
    id: "root",
    layoutOptions: { "elk.algorithm": "org.eclipse.elk.rectpacking", "elk.aspectRatio": "1.8", "elk.spacing.nodeNode": "40" },
    children: [...clusters.values()],
  });
  const result: LayoutResult = { nodes: [], clusters: [] };
  for (const c of out.children ?? []) {
    result.clusters.push({ id: c.id, x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? 0, height: c.height ?? 0 });
    for (const n of c.children ?? []) result.nodes.push({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0, parent: c.id });
  }
  return result;
}
