# Slopshop

Slopshop is a Next.js app for reviewing AI summaries: a filterable, grouped
table by date range with a streamed AI digest, a full-screen report for each
summary, topic discovery as a ranked list and as a clustered graph, and an AI
search over documents, images and videos by meaning. It is a client-side app
that calls its Go API, [summary-api](https://github.com/sri-0/summary-api),
directly.

```bash
pnpm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8002
pnpm dev                        # http://localhost:3100
```

[AGENTS.md](AGENTS.md) describes the structure, the API it calls, the URL
state and the conventions.

## Screenshots

Taken against the seeded local stack at 1920×1200, in dark mode; every one is in `docs/`.

| | |
|---|---|
| **AI Summaries**: the filter rail, the streamed digest and the grouped table | ![AI Summaries](docs/summaries.png) |
| **A report**: the full-screen view, its header badges linking to the filtered summaries and to Explore | ![Summary report](docs/summary-report.png) |
| **AI Search**: suggested searches, kind counts, filters, and image and video results | ![AI Search](docs/ai-search.png) |
| **Discover**: topics in clusters, tags beside them, and a topic's panel | ![Discover](docs/discover.png) |
