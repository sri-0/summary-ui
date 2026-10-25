# Request: summary-ui

Received 2026-10-25, in two messages.

## Message 1

i want you to setup a new UI repo, use the same packages as i have used for agentui and lineage-ui. This UI for now has no backend. I need it to be a UI to review AI summaries, these summaries are sorted by date, they have a severity
level - critical, high, medium, low, have tags, have a project. When i open a summary, i want the artefact to open in a full screen modal (this will be loaded from s3 usually, formatted in markdown, but also have tables, graphs
(mermaid). I want the ability to open a date in the sidebar, then see the summaries for that given date or date range, then we need an AI summary at the top of the results to summarise the resultset. I also need integrated agent chat,
ideally this uses the same libs as the agentui, opens in a panel. ideally we want to keep the parsing libs shared between the two - so it should parse native ag-ui stream, alternaitvely we could embed agentui as a web url figure out a
way to share common parts, then use ai-sdk in this repo too. I also want a topic discovery page, which allows me to explore and drill down on topics, then see summaries/AI reports in those topics. The entire app needs to be agentic and
work natively with my agentlite backend.

. use subagents to plan out the work.

## Message 2

im also happy for this app to have a different look & feel, but it needs to have the same rough layout. Just styling can be more fun/AI vibes (dont go too crazy though). Everything still needs to use shadcn, react-query, nextjs, ai-elements, etc

## Message 3

worry less about the agent chat intergration for now, just get it working with the main parts first. we can add the chat panel last!
