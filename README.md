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
