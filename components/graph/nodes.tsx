"use client";

import { SeverityBar } from "@/components/common/severity-bar";
import type { GraphNode } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { HashIcon } from "lucide-react";
import { type CSSProperties, createContext, memo, useContext } from "react";

/** A topic on the canvas, with its cluster's colour as a CSS value. */
export type TopicNodeData = { topic: GraphNode; color: string };
/** A cluster's area on the canvas, behind its topics. */
export type ClusterNodeData = { label: string; count: number; color: string };
/** A tag on the canvas. */
export type TagNodeData = { tag: GraphNode };

/** What the canvas is pointing at: the selected node, the hovered one and
 *  its neighbours. Nodes read it here rather than through their data, because
 *  React Flow re-measures every node it is handed anew, so the node objects
 *  stay the same while this changes. */
export const GraphState = createContext<{ selected: string | null; hovered: string | null; near: Set<string> }>({ selected: null, hovered: null, near: new Set() });

/** A topic: its label (bolder for a root), count and severity mix, with a
 *  left accent in its cluster's colour. Its width comes from the layout. It
 *  dims when another node is hovered and it is not a neighbour. */
export const TopicNode = memo(function TopicNode({ data }: NodeProps<Node<TopicNodeData, "topic">>) {
  const { topic, color } = data;
  const { selected, hovered, near } = useContext(GraphState);
  return (
    <div
      style={{ "--cluster": color } as CSSProperties}
      className={cn(
        "flex h-full w-full flex-col justify-center gap-1.5 rounded-lg border-l-4 border-l-(--cluster) bg-card px-3 text-card-foreground ring-1 ring-foreground/10 transition-[opacity,box-shadow] hover:ring-foreground/25",
        selected === topic.id && "ring-2 ring-ring hover:ring-ring",
        hovered && !near.has(topic.id) && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      <div className="flex items-baseline gap-2">
        <span className={cn("min-w-0 flex-1 truncate text-sm", topic.parent_id ? "font-normal" : "font-semibold")}>{topic.label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{topic.count}</span>
      </div>
      {topic.severity && <SeverityBar counts={topic.severity} />}
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
});

/** A tag: a pill with its name and count, dimmed like a topic when it is not
 *  near the hovered node. */
export const TagNode = memo(function TagNode({ data }: NodeProps<Node<TagNodeData, "tag">>) {
  const { tag } = data;
  const { selected, hovered, near } = useContext(GraphState);
  return (
    <div
      className={cn(
        "flex h-full w-full items-center gap-1 rounded-full bg-secondary px-2.5 text-xs text-secondary-foreground ring-1 ring-foreground/10 transition-[opacity,box-shadow] hover:ring-foreground/25",
        selected === tag.id && "ring-2 ring-ring hover:ring-ring",
        hovered && !near.has(tag.id) && "opacity-30",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      <HashIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{tag.label}</span>
      <span className="shrink-0 tabular-nums text-muted-foreground">{tag.count}</span>
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
});

/** A cluster: a dashed outline with no fill, named at its top-left in its
 *  colour, sized to hold its topics. */
export function ClusterNode({ data }: NodeProps<Node<ClusterNodeData, "cluster">>) {
  return (
    <div style={{ "--cluster": data.color } as CSSProperties} className="h-full w-full rounded-xl border border-dashed border-foreground/15">


      <div className="absolute top-3 left-4 flex items-center gap-1.5 text-xs font-medium text-(--cluster)">
        <span className="size-2 rounded-full bg-(--cluster)" aria-hidden />
        {data.label}
        <span className="tabular-nums text-muted-foreground">· {data.count}</span>
      </div>
    </div>
  );
}

export const nodeTypes = { topic: TopicNode, cluster: ClusterNode, tag: TagNode };
