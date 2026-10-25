"use client";

import "@xyflow/react/dist/style.css";

import { FilterBar } from "@/components/common/filter-bar";
import { clusterNodeId, type LayoutResult, layoutGraph } from "@/components/graph/layout";
import { type ClusterNodeData, GraphState, nodeTypes, type TopicNodeData } from "@/components/graph/nodes";
import { type Related, TopicPanel } from "@/components/graph/topic-panel";
import { clusterColors } from "@/components/topics/topic-cards";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage } from "@/lib/api/client";
import { useTopicGraph } from "@/lib/api/graph";
import type { GraphEdge, TopicGraph } from "@/lib/api/types";
import { dayjs } from "@/lib/dayjs";
import { type EdgeKind, useFilters } from "@/lib/url/filters";
import { cn } from "@/lib/utils";
import { Background, Controls, type Edge, MiniMap, type Node, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { CircleAlertIcon, Maximize2Icon, WaypointsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

/** Edges of the drawn kind are this wide, scaled by weight. */
const STROKE_MIN = 1;
const STROKE_MAX = 5;
/** How many related topics the panel lists. */
const RELATED_MAX = 8;

type TopicNode = Node<TopicNodeData, "topic">;
type ClusterNode = Node<ClusterNodeData, "cluster">;

/** The topic graph page: every topic in the range laid out inside its
 *  cluster, joined by co-occurrence or shared-tag edges (the URL's `edges`),
 *  with the selected topic (`topic`) detailed in a resizable panel at the
 *  right of the canvas. The canvas is transparent, so the page's own wash
 *  runs under the header and the graph alike. */
export function GraphView() {
  return (
    <ReactFlowProvider>
      <Graph />
    </ReactFlowProvider>
  );
}

function Graph() {
  const { filters, edges: kind, setFilters } = useFilters();
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
  const drawn = useMemo(() => graph?.edges.filter((e) => e.kind === kind || e.kind === "hierarchy") ?? [], [graph, kind]);
  const near = useMemo(() => neighbours(drawn, hovered), [drawn, hovered]);
  // The node objects change only with the graph: React Flow re-measures every
  // node it is handed anew, so hover and selection reach nodes by context.
  const nodes = useMemo(() => buildNodes(graph, layout, colors), [graph, layout, colors]);
  const edges = useMemo(() => buildEdges(drawn, layout, kind, hovered, near), [drawn, layout, kind, hovered, near]);
  const state = useMemo(() => ({ selected: filters.topic, hovered, near }), [filters.topic, hovered, near]);
  const related = useMemo(() => (graph && selected ? relatedTo(graph, selected.id, kind) : []), [graph, selected, kind]);

  const from = dayjs(filters.from);
  const to = dayjs(filters.to);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 px-4 pt-3 pb-3 md:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Discover</h1>
          <p className="text-sm text-muted-foreground">
            {from.isSame(to, "day") ? to.format("D MMM YYYY") : `${from.format("D MMM")} – ${to.format("D MMM YYYY")}`}
            {graph && <> · {graph.nodes.length} topics in {graph.clusters.length} clusters</>}
          </p>
        </div>
        <FilterBar show={["severity", "project", "tag", "q"]}>
          <ToggleGroup type="single" variant="outline" size="sm" aria-label="Edges" value={kind} onValueChange={(v) => v && setFilters({ edges: v as EdgeKind })}>
            <ToggleGroupItem value="cooccurrence">Co-occurrence</ToggleGroupItem>
            <ToggleGroupItem value="tags">Shared tags</ToggleGroupItem>
          </ToggleGroup>
          {graph && graph.clusters.length > 0 && (
            <ul aria-label="Clusters" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {graph.clusters.map((c) => (
                <li key={c.id} className="flex items-center gap-1.5" style={{ "--cluster": colors.get(c.id) } as CSSProperties}>
                  <span className="size-2 rounded-full bg-(--cluster)" aria-hidden />
                  {c.label}
                </li>
              ))}
            </ul>
          )}
          <Button variant="outline" size="sm" onClick={() => void fitView({ padding: 0.1, duration: 200 })}>
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
                  <WaypointsIcon />
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
                onNodeClick={(_, n) => n.type === "topic" && setFilters({ topic: n.id })}
                onNodeMouseEnter={(_, n) => n.type === "topic" && setHovered(n.id)}
                onNodeMouseLeave={() => setHovered(null)}
                onPaneClick={() => setFilters({ topic: null })}
                className="bg-transparent [--xy-controls-box-shadow:none] [--xy-controls-button-background-color:var(--card)] [--xy-controls-button-background-color-hover:var(--muted)] [--xy-controls-button-border-color:var(--border)] [--xy-controls-button-color:var(--muted-foreground)] [--xy-controls-button-color-hover:var(--foreground)] [--xy-minimap-background-color:var(--card)] [--xy-minimap-mask-background-color:color-mix(in_oklab,var(--background)_70%,transparent)] [--xy-minimap-node-stroke-color:transparent]"
              >
                <Background gap={24} color="var(--border)" />
                <Controls showInteractive={false} className="overflow-hidden rounded-md" />
                <MiniMap pannable zoomable className="rounded-md ring-1 ring-foreground/10" nodeColor={(n: Node) => (n.type === "topic" ? (n.data as TopicNodeData).color : "transparent")} />
              </ReactFlow>
            </GraphState>
          )}
        </ResizablePanel>
        {selected && (
          <>
            <ResizableHandle withHandle className="bg-transparent after:w-3 [&>div]:h-10 [&>div]:opacity-0 [&>div]:transition-opacity hover:[&>div]:opacity-100 active:[&>div]:opacity-100" />

            <ResizablePanel id="topic" defaultSize="28%" minSize="20%" maxSize="45%" className="min-h-0">
              <TopicPanel
                key={selected.id}
                topic={selected}
                color={colors.get(selected.cluster_id)!}
                related={related}
                kind={kind}
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

/** The hovered topic and every topic a drawn edge joins it to; empty when nothing is hovered. */
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

/** A cluster node behind each cluster's topics, placed and sized by the
 *  layout. The sizes go on the nodes themselves, so React Flow (and its
 *  MiniMap) has them without measuring the DOM. */
function buildNodes(graph: TopicGraph | undefined, layout: LayoutResult | null, colors: Map<string, string>): (TopicNode | ClusterNode)[] {
  const nodes: (TopicNode | ClusterNode)[] = [];
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
  const topicById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const n of layout.nodes) {
    const topic = topicById.get(n.id);
    if (!topic) continue;
    nodes.push({
      id: n.id,
      type: "topic",
      position: { x: n.x, y: n.y },
      parentId: n.parent,
      extent: "parent",
      data: { topic, color: colors.get(topic.cluster_id)! },
      width: n.width,
      height: n.height,
      ariaLabel: `${topic.label}, ${topic.count} summaries`,
    });
  }
  return nodes;
}

/** The drawn kind's edges scaled by weight, hierarchy edges faint, and every
 *  edge away from the hovered topic dimmed. Edges run left to right so none
 *  loops back on itself. */
function buildEdges(drawn: GraphEdge[], layout: LayoutResult | null, kind: EdgeKind, hovered: string | null, near: Set<string>): Edge[] {
  const edges: Edge[] = [];
  if (!layout) return edges;
  const left = new Map<string, number>();
  for (const n of layout.nodes) left.set(n.id, n.x + (layout.clusters.find((c) => c.id === n.parent)?.x ?? 0));
  const weights = drawn.filter((e) => e.kind === kind).map((e) => e.weight);
  const min = Math.min(...weights);
  const span = Math.max(...weights) - min || 1;
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
          : { stroke: "var(--muted-foreground)", strokeWidth: STROKE_MIN + ((STROKE_MAX - STROKE_MIN) * (e.weight - min)) / span, opacity: 0.6 },
    });
  }
  return edges;
}

/** The topics joined to `id` by edges of `kind`, heaviest first. */
function relatedTo(graph: TopicGraph, id: string, kind: EdgeKind): Related[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const other = (e: GraphEdge) => (e.source === id ? e.target : e.source);
  return graph.edges
    .filter((e) => e.kind === kind && (e.source === id || e.target === id) && byId.has(other(e)))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, RELATED_MAX)
    .map((e) => ({ topic: byId.get(other(e))!, weight: e.weight }));
}
