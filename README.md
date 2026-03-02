# Todo Agent

[![Portfolio](https://img.shields.io/badge/Portfolio-omarhabash.com-blue?style=for-the-badge)](https://omarhabash.com/?todoagent)

CLI todo list assistant powered by OpenAI Agents.

## Use cases

- **Add** — single items, multiple items, or inferred lists (e.g. "add ingredients for baking a cake")
- **Complete / remove** — mark tasks done, one at a time or "complete all"
- **Reactivate** — undo completed tasks (e.g. "reactivate all food items")
- **List** — show tasks with open (⬜) and completed (✅) status
- **Batch by category** — "complete all", "reactivate all colors", "only baking items should be active"

## Setup

Create a `.env` file with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
TRACING=true
```

Set `TRACING=true` to show tool call traces in the chat.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run init` | First-time setup: installs deps and starts the app |
| `npm start` | Run the todo agent |
| `npm test` | Run tests |
