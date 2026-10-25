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

Taken against the seeded local stack; every one is in `docs/`.

| | |
|---|---|
| **AI Summaries**: the filter rail, the streamed digest and the grouped table ([light](docs/summaries-light.png)) | ![AI Summaries](docs/summaries.png) |
| **Filtered**: severity and project applied, grouped by project | ![Filtered summaries](docs/summaries-filtered.png) |
| **A report**: the full-screen view with Share link and Copy markdown | ![Summary report](docs/summary-report.png) |
| **Share link**: the same report at its own route, led by the brand | ![Standalone report](docs/summary-share-route.png) |
| **AI Search**: suggested searches, kind counts, filters and the tag cloud | ![AI Search](docs/ai-search.png) |
| **Results**: cards with scores, Load more and the end mark | ![Search results](docs/ai-search-results.png) |
| **A document**: an image served from the bucket, with Open summary | ![Document](docs/ai-search-document.png) |
| **Explore**: ranked topics with the trend ([cards](docs/explore-cards.png), [one topic](docs/explore-topic.png)) | ![Explore](docs/explore.png) |
| **Filters**: the popover with Apply and Clear, on Explore | ![Filters popover](docs/filters-popover.png) |
| **Discover**: topics in clusters, tags beside them, a topic's panel ([a tag, light](docs/discover-tag-light.png)) | ![Discover](docs/discover.png) |
| **Discover options**: what the canvas draws | ![Discover options](docs/discover-options.png) |
