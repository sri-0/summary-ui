import type { TopicGraph } from "@/lib/api/types";
import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";

/** A topic node's width scales with its count between these; its height is fixed. */
export const NODE_MIN_W = 120;
export const NODE_MAX_W = 220;
export const NODE_H = 56;
/** A tag node is a pill sized to its label, within these. */
export const TAG_MIN_W = 72;
export const TAG_MAX_W = 160;
export const TAG_H = 28;
const TAG_GAP = 10;
const TAG_COLUMN_GAP = 16;
const TAGS_PER_COLUMN = 16;
/** The space between the clusters and the tag columns. */
const TAGS_OFFSET = 96;

/** A laid-out node: a topic's position is relative to its cluster, a cluster's
 *  and a tag's to the canvas. */
export type Positioned = { id: string; x: number; y: number; width: number; height: number; parent?: string };
export type LayoutResult = { nodes: Positioned[]; clusters: Positioned[]; tags: Positioned[] };

/** The id of a cluster's node on the canvas, distinct from any topic's id. */
export const clusterNodeId = (id: string) => `cluster:${id}`;

const elk = new ELK();

/** Lays the graph out in two levels: each cluster is a compound node whose
 *  topics are layered left to right by the edges among them, and the
 *  clusters are packed into a canvas near the screen's shape. The tags stand
 *  in columns to the right of the clusters, each tag level with the topics
 *  it is tagged on (the weighted mean of their heights), so its edges run
 *  short. Edges between clusters are drawn but do not place anything: the
 *  clustering already says what belongs together. */
export async function layoutGraph(g: TopicGraph): Promise<LayoutResult> {
  const topics = g.nodes.filter((n) => n.kind !== "tag");
  const counts = topics.map((n) => n.count);
  const min = Math.min(...counts);
  const span = Math.max(...counts) - min || 1;
  const clusterOf = new Map(topics.map((n) => [n.id, n.cluster_id ?? ""]));
  const clusters = new Map<string, ElkNode>();
  for (const n of topics) {
    const id = n.cluster_id ?? "";
    const cluster =
      clusters.get(id) ??
      clusters
        .set(id, {
          id: clusterNodeId(id),
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
        .get(id)!;
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
  const result: LayoutResult = { nodes: [], clusters: [], tags: [] };
  const centreY = new Map<string, number>();
  let right = 0;
  for (const c of out.children ?? []) {
    result.clusters.push({ id: c.id, x: c.x ?? 0, y: c.y ?? 0, width: c.width ?? 0, height: c.height ?? 0 });
    right = Math.max(right, (c.x ?? 0) + (c.width ?? 0));
    for (const n of c.children ?? []) {
      result.nodes.push({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, width: n.width ?? 0, height: n.height ?? 0, parent: c.id });
      centreY.set(n.id, (c.y ?? 0) + (n.y ?? 0) + (n.height ?? 0) / 2);
    }
  }

  // Each tag's height is the weighted mean of its topics'; the tags then
  // stack in that order, in columns.
  const pull = new Map<string, { sum: number; weight: number }>();
  for (const e of g.edges) {
    if (e.kind !== "tag" || !centreY.has(e.source)) continue;
    const p = pull.get(e.target) ?? { sum: 0, weight: 0 };
    pull.set(e.target, { sum: p.sum + centreY.get(e.source)! * e.weight, weight: p.weight + e.weight });
  }
  const tags = g.nodes
    .filter((n) => n.kind === "tag")
    .map((n) => ({ n, y: pull.has(n.id) ? pull.get(n.id)!.sum / pull.get(n.id)!.weight : Infinity }))
    .sort((a, b) => a.y - b.y);
  const columns = Math.max(1, Math.ceil(tags.length / TAGS_PER_COLUMN));
  const perColumn = Math.ceil(tags.length / columns);
  tags.forEach(({ n }, i) => {
    const column = Math.floor(i / perColumn);
    const row = i % perColumn;
    result.tags.push({
      id: n.id,
      x: right + TAGS_OFFSET + column * (TAG_MAX_W + TAG_COLUMN_GAP),
      y: row * (TAG_H + TAG_GAP),
      width: Math.min(TAG_MAX_W, Math.max(TAG_MIN_W, n.label.length * 7 + 44)),
      height: TAG_H,
    });
  });
  return result;
}
