# Todo Agent

[![Portfolio](https://img.shields.io/badge/Portfolio-omarhabash.com-blue?style=for-the-badge)](https://omarhabash.com/?todoagent)

CLI todo list assistant powered by OpenAI Agents.

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
