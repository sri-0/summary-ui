"use client";

import "@xyflow/react/dist/style.css";

import { FilterBar } from "@/components/common/filter-bar";
import { clusterNodeId, type LayoutResult, layoutGraph } from "@/components/graph/layout";
import { type Linked, NodePanel } from "@/components/graph/node-panel";
import { type ClusterNodeData, GraphState, nodeTypes, type TagNodeData, type TopicNodeData } from "@/components/graph/nodes";
import { clusterColors } from "@/components/topics/topic-cards";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useTopicGraph } from "@/lib/api/graph";
import type { GraphEdge, TopicGraph } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { Background, Controls, type Edge, MiniMap, type Node, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { CircleAlertIcon, GraphStarIcon, Maximize2Icon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

/** Co-occurrence edges are this wide, scaled by weight; tag edges thinner. */
const STROKE_MIN = 1;
const STROKE_MAX = 5;
const TAG_STROKE_MAX = 2.5;
/** How many linked nodes of each kind the panel lists. */
const LINKED_MAX = 8;
/** How many of a topic's tags are drawn as edges; the panel lists them all. */
const TAG_EDGES_PER_TOPIC = 4;

type TopicNode = Node<TopicNodeData, "topic">;
type ClusterNode = Node<ClusterNodeData, "cluster">;
type TagNode = Node<TagNodeData, "tag">;

/** The Discover page: every topic in the range laid out inside its cluster
 *  and joined by co-occurrence, the set's top tags standing beside them and
 *  joined to the topics they are on, so topics, tags and how they connect
 *  are one picture. The selected node (`topic`, a topic id or `tag:<tag>`)
 *  is detailed in a resizable panel at the right of the canvas. */
export function GraphView() {
  return (
    <ReactFlowProvider>
      <Graph />
    </ReactFlowProvider>
  );
}

function Graph() {
  const { filters, setFilters } = useFilters();
  const { data: graph, error, isPending, isPlaceholderData, refetch } = useTopicGraph(filters);
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const { fitView } = useReactFlow();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!graph) return;
    let alive = true;
    void layoutGraph(graph).then((l) => alive && setLayout(l));
    return () => {
      alive = false;
    };
  }, [graph]);
  useEffect(() => {
    if (layout) requestAnimationFrame(() => void fitView({ padding: 0.1, duration: 200 }));
  }, [layout, fitView]);

  const colors = useMemo(() => clusterColors(graph?.clusters.map((c) => c.id) ?? []), [graph]);
  const selected = graph?.nodes.find((n) => n.id === filters.topic);
  const drawn = useMemo(() => drawnEdges(graph), [graph]);
  const near = useMemo(() => neighbours(drawn, hovered), [drawn, hovered]);
  // The node objects change only with the graph: React Flow re-measures every
  // node it is handed anew, so hover and selection reach nodes by context.
  const nodes = useMemo(() => buildNodes(graph, layout, colors), [graph, layout, colors]);
  const edges = useMemo(() => buildEdges(drawn, layout, hovered, near), [drawn, layout, hovered, near]);
  const state = useMemo(() => ({ selected: filters.topic, hovered, near }), [filters.topic, hovered, near]);
  const linked = useMemo(() => (graph && selected ? linkedTo(graph, selected.id) : { topics: [], tags: [] }), [graph, selected]);

  const from = dayjs(filters.from);
  const to = dayjs(filters.to);
  const tagCount = graph?.nodes.filter((n) => n.kind === "tag").length ?? 0;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 px-4 pt-3 pb-3 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="text-sm text-muted-foreground">
            {from.isSame(to, "day") ? to.format("D MMM YYYY") : `${from.format("D MMM")} – ${to.format("D MMM YYYY")}`}
            {graph && (
              <>
                {" "}
                · {graph.nodes.length - tagCount} topics in {graph.clusters.length} clusters{tagCount > 0 && <> · {tagCount} tags</>}
              </>
            )}
          </p>
        </div>
        <FilterBar show={["severity", "project", "tag", "q"]}>
          <Button variant="outline" size="sm" className="bg-card" onClick={() => void fitView({ padding: 0.1, duration: 200 })}>
            <Maximize2Icon data-icon="inline-start" />
            Fit
          </Button>
        </FilterBar>
      </header>

      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="graph" minSize="40%" className={cn("relative min-h-0 transition-opacity", isPlaceholderData && "opacity-70")}>
          {isPending ? (
            <Skeleton className="h-full w-full rounded-none" />
          ) : error ? (
            <Alert variant="destructive" className="m-4 w-auto md:mx-6">
              <CircleAlertIcon />
              <AlertTitle>The graph didn&apos;t load</AlertTitle>
              <AlertDescription>{errorMessage(error)}</AlertDescription>
              <AlertAction>
                <Button variant="outline" size="xs" onClick={() => void refetch()}>
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          ) : graph.nodes.length === 0 ? (
            <Empty className="h-full">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GraphStarIcon />
                </EmptyMedia>
                <EmptyTitle>No topics in this range</EmptyTitle>
                <EmptyDescription>Widen the dates or clear filters.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <GraphState value={state}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                colorMode={resolvedTheme === "dark" ? "dark" : "light"}
                fitView
                fitViewOptions={{ padding: 0.1 }}
                minZoom={0.1}
                elementsSelectable={false}
                nodesConnectable={false}
                nodesDraggable={false}
                edgesFocusable={false}
                onNodeClick={(_, n) => n.type !== "cluster" && setFilters({ topic: n.id })}
                onNodeMouseEnter={(_, n) => n.type !== "cluster" && setHovered(n.id)}
                onNodeMouseLeave={() => setHovered(null)}
                onPaneClick={() => setFilters({ topic: null })}
                className="[--xy-background-color:var(--background)] [--xy-controls-box-shadow:none] [--xy-controls-button-background-color:var(--card)] [--xy-controls-button-background-color-hover:var(--muted)] [--xy-controls-button-border-color:var(--border)] [--xy-controls-button-color:var(--muted-foreground)] [--xy-controls-button-color-hover:var(--foreground)] [--xy-minimap-background-color:var(--card)] [--xy-minimap-mask-background-color:color-mix(in_oklab,var(--background)_70%,transparent)] [--xy-minimap-node-stroke-color:transparent]"
              >
                <Background gap={24} color="var(--border)" />
                <Controls showInteractive={false} className="overflow-hidden rounded-md" />
                <MiniMap pannable zoomable className="rounded-md ring-1 ring-foreground/10" nodeColor={(n: Node) => (n.type === "topic" ? (n.data as TopicNodeData).color : n.type === "tag" ? "var(--muted-foreground)" : "transparent")} />
              </ReactFlow>
            </GraphState>
          )}
        </ResizablePanel>
        {selected && (
          <>
            <ResizableHandle withHandle className="bg-transparent after:w-3 [&>div]:h-10 [&>div]:opacity-0 [&>div]:transition-opacity hover:[&>div]:opacity-100 active:[&>div]:opacity-100" />
            <ResizablePanel id="node" defaultSize="28%" minSize="20%" maxSize="45%" className="min-h-0">
              <NodePanel
                key={selected.id}
                node={selected}
                color={selected.cluster_id ? colors.get(selected.cluster_id) : undefined}
                topics={linked.topics}
                tags={linked.tags}
                filters={filters}
                onSelect={(id) => setFilters({ topic: id })}
                onClose={() => setFilters({ topic: null })}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

/** The edges the canvas draws: every co-occurrence and hierarchy edge, and
 *  each topic's heaviest TAG_EDGES_PER_TOPIC tag edges, so the tags read as
 *  a second layer rather than a thicket. */
function drawnEdges(graph: TopicGraph | undefined): GraphEdge[] {
  if (!graph) return [];
  const perTopic = new Map<string, number>();
  return [...graph.edges]
    .sort((a, b) => b.weight - a.weight)
    .filter((e) => {
      if (e.kind !== "tag") return e.kind === "cooccurrence" || e.kind === "hierarchy";
      const n = perTopic.get(e.source) ?? 0;
      perTopic.set(e.source, n + 1);
      return n < TAG_EDGES_PER_TOPIC;
    });
}

/** The hovered node and every node a drawn edge joins it to; empty when nothing is hovered. */
function neighbours(drawn: GraphEdge[], hovered: string | null): Set<string> {
  const near = new Set<string>();
  if (!hovered) return near;
  near.add(hovered);
  for (const e of drawn) {
    if (e.source === hovered) near.add(e.target);
    if (e.target === hovered) near.add(e.source);
  }
  return near;
}

/** A cluster node behind each cluster's topics, the topics inside them and
 *  the tags beside, placed and sized by the layout. The sizes go on the
 *  nodes themselves, so React Flow (and its MiniMap) has them without
 *  measuring the DOM. */
function buildNodes(graph: TopicGraph | undefined, layout: LayoutResult | null, colors: Map<string, string>): (TopicNode | ClusterNode | TagNode)[] {
  const nodes: (TopicNode | ClusterNode | TagNode)[] = [];
  if (!graph || !layout) return nodes;
  const clusterById = new Map(graph.clusters.map((c) => [clusterNodeId(c.id), c]));
  for (const c of layout.clusters) {
    const cluster = clusterById.get(c.id);
    if (!cluster) continue;
    nodes.push({
      id: c.id,
      type: "cluster",
      position: { x: c.x, y: c.y },
      data: { label: cluster.label, count: cluster.count, color: colors.get(cluster.id)! },
      width: c.width,
      height: c.height,
      focusable: false,
      zIndex: -1,
    });
  }
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const n of layout.nodes) {
    const topic = byId.get(n.id);
    if (!topic) continue;
    nodes.push({
      id: n.id,
      type: "topic",
      position: { x: n.x, y: n.y },
      parentId: n.parent,
      extent: "parent",
      data: { topic, color: colors.get(topic.cluster_id ?? "") ?? "var(--muted-foreground)" },
      width: n.width,
      height: n.height,
      ariaLabel: `${topic.label}, ${topic.count} summaries`,
    });
  }
  for (const t of layout.tags) {
    const tag = byId.get(t.id);
    if (!tag) continue;
    nodes.push({ id: t.id, type: "tag", position: { x: t.x, y: t.y }, data: { tag }, width: t.width, height: t.height, ariaLabel: `Tag ${tag.label}, ${tag.count} summaries` });
  }
  return nodes;
}

/** Co-occurrence edges scaled by weight, tag edges thinner and lighter,
 *  hierarchy edges faint, and every edge away from the hovered node dimmed.
 *  Edges run left to right so none loops back on itself. */
function buildEdges(drawn: GraphEdge[], layout: LayoutResult | null, hovered: string | null, near: Set<string>): Edge[] {
  const edges: Edge[] = [];
  if (!layout) return edges;
  const left = new Map<string, number>();
  for (const n of layout.nodes) left.set(n.id, n.x + (layout.clusters.find((c) => c.id === n.parent)?.x ?? 0));
  for (const t of layout.tags) left.set(t.id, t.x);
  const scale = (kind: GraphEdge["kind"]) => {
    const weights = drawn.filter((e) => e.kind === kind).map((e) => e.weight);
    const min = Math.min(...weights);
    return { min, span: Math.max(...weights) - min || 1 };
  };
  const co = scale("cooccurrence");
  const tag = scale("tag");
  for (const e of drawn) {
    if (!left.has(e.source) || !left.has(e.target)) continue;
    const [source, target] = left.get(e.source)! <= left.get(e.target)! ? [e.source, e.target] : [e.target, e.source];
    edges.push({
      id: `${e.kind}:${e.source}>${e.target}`,
      source,
      target,
      interactionWidth: 0,
      className: cn("transition-opacity", hovered && !(near.has(e.source) && near.has(e.target)) && "opacity-10"),
      style:
        e.kind === "hierarchy"
          ? { stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4 4" }
          : e.kind === "tag"
            ? { stroke: "var(--muted-foreground)", strokeWidth: STROKE_MIN + ((TAG_STROKE_MAX - STROKE_MIN) * (e.weight - tag.min)) / tag.span, opacity: 0.25 }

            : { stroke: "var(--muted-foreground)", strokeWidth: STROKE_MIN + ((STROKE_MAX - STROKE_MIN) * (e.weight - co.min)) / co.span, opacity: 0.6 },
    });
  }
  return edges;
}

/** The nodes joined to `id`, heaviest first: the topics it co-occurs with
 *  (for a tag, the topics it is on) and, for a topic, its tags. */
function linkedTo(graph: TopicGraph, id: string): { topics: Linked[]; tags: Linked[] } {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const other = (e: GraphEdge) => (e.source === id ? e.target : e.source);
  const touching = graph.edges.filter((e) => (e.source === id || e.target === id) && byId.has(other(e))).sort((a, b) => b.weight - a.weight);
  const pick = (kind: GraphEdge["kind"]) => touching.filter((e) => e.kind === kind).slice(0, LINKED_MAX).map((e) => ({ node: byId.get(other(e))!, weight: e.weight }));
  return byId.get(id)?.kind === "tag" ? { topics: pick("tag"), tags: [] } : { topics: pick("cooccurrence"), tags: pick("tag") };
}
