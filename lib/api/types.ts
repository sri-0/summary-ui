/**
 * The summaries API's types, as summary-api serves them under /v1.
 */

import type { AttributeKey, Kind, Severity } from "@/lib/url/filters";

/** A topic a summary belongs to: the leaf, its root, and the cluster the
 *  topic pipeline placed it in. */
export type TopicRef = {
  id: string;
  label: string;
  parent_id: string;
  parent_label: string;
  cluster_id: string;
  cluster_label: string;
};

/** Attributes extracted from a summary, by key, for filtering; `ip` lists
 *  every address the summary mentions. */
export type Attributes = Partial<Record<AttributeKey, string[]>>;

/** One AI summary's metadata; its markdown body is GET /v1/summaries/{id}/body. */
export type Summary = {
  id: string;
  title: string;
  /** ISO 8601 with offset. */
  created_at: string;
  updated_at: string;
  severity: Severity;
  project: { id: string; name: string };
  tags: string[];
  /** The primary topic; `related_topics` are the others it touches, and
   *  `topic_ids` lists every topic and root among them. */
  topic: TopicRef;
  related_topics: TopicRef[];
  topic_ids: string[];
  attributes: Attributes;
  excerpt: string;
  controlset_id: string;
  user_created_by: string;
  user_updated_by: string;
};

/** Counts per facet value for the filtered set. Each facet is computed with
 *  the other facets applied, so a picked value's alternatives keep counts. */
export type Facets = {
  severity: Record<Severity, number>;
  projects: { id: string; name: string; count: number }[];
  tags: { tag: string; count: number }[];
  topics: { id: string; label: string; count: number }[];
  attributes: Partial<Record<AttributeKey, { value: string; count: number }[]>>;
};

/** A page of summaries, newest first, with the set's facets. */
export type SummaryList = {
  data: Summary[];
  total: number;
  next?: string;
  facets: Facets;
};

/** A day that has summaries, for the calendar's markers. */
export type CalendarDay = {
  /** YYYY-MM-DD */
  date: string;
  count: number;
  max_severity: Severity;
};

/** A topic the backend extracted, with its counts for the requested range. */
export type Topic = {
  id: string;
  label: string;
  parent_id?: string;
  parent_label?: string;
  cluster_id: string;
  cluster_label: string;
  count: number;
  /** The count for the same-length period before `from`. */
  previous_count: number;
  severity: Record<Severity, number>;
  /** Per day in the range. */
  trend: ({ date: string } & Record<Severity, number>)[];
  children_count: number;
};

/** A page of topics, ranked by count: GET /v1/topics. `next` is the cursor
 *  for the following page, present only while there is one. */
export type TopicList = { data: Topic[]; total: number; next?: string };

/** A node of the topic graph: a topic with its standing in the range (its
 *  cluster, root and severity mix), or one of the set's top tags (`kind`
 *  "tag", id `tag:<tag>`, with how many summaries carry it). */
export type GraphNode = {
  id: string;
  kind: "topic" | "tag";
  label: string;
  parent_id?: string;
  parent_label?: string;
  cluster_id?: string;
  cluster_label?: string;
  count: number;
  severity?: Record<Severity, number>;
};

/** How two nodes relate: summaries carrying both topics (`cooccurrence`), a
 *  topic's summaries carrying a tag (`tag`, from the topic to the tag), or
 *  the root and its leaf (`hierarchy`). */
export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
  kind: "cooccurrence" | "tag" | "hierarchy";
};


/** A cluster the topic pipeline formed, with how many summaries fall in it. */
export type GraphCluster = { id: string; label: string; count: number };

/** The topic graph for a range: GET /v1/topics/graph. */
export type TopicGraph = { nodes: GraphNode[]; edges: GraphEdge[]; clusters: GraphCluster[] };

/** A document the semantic search matched: its metadata, where its media is
 *  served from (paths under the API), and how close it came to the query. */
export type SearchDocument = {
  id: string;
  kind: Kind;
  title: string;
  /** The body, caption or transcript; may be long. */
  text: string;
  /** The first prose paragraph, at most 200 characters, for cards. */
  excerpt: string;
  media_type: string;
  s3_ref: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  /** The summary this document belongs to, when it has one. */
  summary_id?: string;
  project: { id: string; name: string };
  tags: string[];
  created_at: string;
  /** The similarity to the query, on search hits only; a document fetched by
   *  id has none. */
  score?: number;
  /** `/v1/documents/<id>/content`: the object, with its media type. */
  content_url: string;
  /** `/v1/documents/<id>/thumbnail`: a PNG, for images and videos. */
  thumbnail_url?: string;
};

/** A page of a search's matches, closest first: GET /v1/search. `next` is
 *  the cursor for the following page, present only while there is one. */
export type SearchResult = { data: SearchDocument[]; total: number; took_ms: number; model: string; next?: string };

/** The signed-in user, from their token: GET /v1/me. */
export type Me = { username: string; controlsets: string[] };

/** How many documents the filters match, by kind, project and tag: GET
 *  /v1/documents/facets. Each dimension is computed with the other dimensions
 *  applied and its own left out, so a picked value's alternatives keep their
 *  counts; `total` has every filter applied. Counts run highest first. */
export type DocumentFacets = {
  total: number;
  kinds: { kind: Kind; count: number }[];
  projects: { id: string; name: string; count: number }[];
  tags: { tag: string; count: number }[];
};
