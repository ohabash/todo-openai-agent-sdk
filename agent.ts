import "dotenv/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("colors");
import { z } from "zod";
import { Agent, addTraceProcessor, Runner, assistant, setTracingDisabled, tool, user, AgentInputItem } from "@openai/agents";
import { chatBubble, createPromptInput } from "./terminal-components";
import { createChatTraceProcessor, ensureThinkingRemoved, setClearThinking } from "./tracing/chat-trace-processor";

const TRACING_ENABLED = process.env.TRACING === "true";

if (TRACING_ENABLED) {
  setTracingDisabled(false);
  addTraceProcessor(createChatTraceProcessor());
}
const runner = new Runner({ tracingDisabled: !TRACING_ENABLED });
import { StateService, TodoService } from "./services";
import { DEFAULT_APP_STATE } from "./types";

// state + todos (always read from state)
const stateService = new StateService("state.json", DEFAULT_APP_STATE);
const todoService = new TodoService(stateService);

/* =================================
  TOOLS
================================= */

// add_todo — adds item
const addTodoTool = tool({
  name: "add_todo",
  description: `Add an item to the todo list.
Use when the user says: "add X", "create X", "new task X", etc.
IMPORTANT: For "add rice cereal milk" make 3 separate calls with item "rice", "cereal", "milk". Never pass multiple items in one call.`,
  parameters: z.object({ item: z.string() }),
  execute: async ({ item }) => todoService.add(item),
});

// remove_task — marks task complete. Trigger: "remove", "complete", "clear"
const removeTaskTool = tool({
  name: "remove_task",
  description: `Mark a task complete (does not delete). Use when the user says: "remove X", "complete X", "clear X", "get rid of X".
IMPORTANT: For "remove rice milk and sugar" make 3 separate calls. Never pass multiple items in one call.
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.complete(idOrTitle),
});

// complete_task — marks task complete. Trigger: "done", "finish"
const completeTaskTool = tool({
  name: "complete_task",
  description: `Mark a task as done/complete. Use when the user says: "finish X", "done with X", "mark X done".
IMPORTANT: For multiple items make separate calls. Never pass multiple items in one call.
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.complete(idOrTitle),
});

// list_todos — returns JSON only
const listTodosTool = tool({
  name: "list_todos",
  description: `Get all tasks. Returns raw JSON array.
Use when the user wants raw data.`,
  parameters: z.object({}),
  execute: async () => JSON.stringify(todoService.list(), null, 2),
  
});

// format_list — returns formatted display string. ■ = open, ✅ = complete. reliable, deterministic.
const formatListTool = tool({
  name: "format_list",
  description: `Get a formatted display of all tasks. Returns string with one task per line: "- ■ Task" (open) or "- ✅ Task" (done).
Use when the user says: "list", "show my tasks", "what's on my list", "display tasks", etc.`,
  parameters: z.object({}),
  execute: async () => todoService.format(),
});

// delete_task — permanently remove. Trigger: "delete" only
const deleteTaskTool = tool({
  name: "delete_task",
  description: `Permanently delete a task from the list. Use ONLY when the user says "delete X".
Do NOT use for remove/complete/clear — use remove_task or complete_task instead.
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.delete(idOrTitle),
});

// reactivate_task — set completed task back to open
const reactivateTaskTool = tool({
  name: "reactivate_task",
  description: `Reactivate a completed task (set it back to open/not done).
Use when the user says: "reactivate X", "undo X", "reopen X", "mark X open again", etc.
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".
IMPORTANT: Call ONCE PER ITEM for multiple items.`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.reactivate(idOrTitle),
});




/* =================================
  AGENT: Todo List Assistant
================================= */
const STOP_AT_TOOLS = ["add_todo", "remove_task", "complete_task", "delete_task", "list_todos", "format_list"];

/** Use LAST matching tool output so all parallel tool calls finish before we return. */
function toolUseBehavior(_context, toolResults) {
  const last = toolResults[toolResults.length - 1];

  if (!last) return { isFinalOutput: false };

  // Only stop if last tool was format_list
  if (last.tool.name === "format_list") {
    return {
      isFinalOutput: true,
      finalOutput: String(last.output ?? ""),
    };
  }

  // Otherwise allow the agent to continue reasoning
  return { isFinalOutput: false };
}

// create agent
const agent = new Agent({
  name: "Todo List Assistant",
  instructions: `You are my helpful assistant. Help manage tasks using the tools.
Only claim success when a tool actually returns success. Prefer format_list over list_todos for display.

When the user asks to add, remove, complete, or reactivate MULTIPLE items:
- Call add_todo, remove_task, complete_task, or reactivate_task SEPARATELY for EACH item.
- Never combine multiple items in one tool call (e.g. never pass "rice milk" as a single idOrTitle).
If the user refers to a known group, category, or concept (e.g. "ingredients for chili", "groceries for tacos", "packing list for camping"):
- Infer a reasonable list of concrete items.
- Then call add_todo separately for each inferred item.
- Do not ask for clarification unless the request is truly ambiguous.
`,
  tools: [
    addTodoTool,
    removeTaskTool,
    completeTaskTool,
    deleteTaskTool,
    reactivateTaskTool,
    listTodosTool,
    formatListTool,
  ],
  toolUseBehavior,
});




/* =================================
  RUN AGENT
================================= */

// create prompt input
const promptInput = createPromptInput();

let thread: AgentInputItem[] = [];

// cycle prompt
function prompt(): void {
  promptInput.question(async (input) => {
    // parse input
    const message = input.trim();

    // check for directions
    const isErrorTest = message.toLowerCase() === "test error";

    // handle exit
    const shouldExit = !message || message.toLowerCase() === "exit" || message.toLowerCase() === "quit";
    if (shouldExit) {
      console.log("\n" + (" Thanks for using Todo Agent! " as any).bgCyan.black.bold + "\n" + ("See you next time. 👋" as any).dim + "\n" + ("https://omarhabash.com/?todoagent" as any).dim + "\n");
      promptInput.rl.close();
      process.exit(0);
    }

    // add "user" message
    chatBubble(message, "user");

    // run agent (catch errors)
    try {
      const { remove } = chatBubble("Thinking...", "loading");
      setClearThinking(remove ?? null);

      const result = await runner.run(agent, thread.concat({ role: 'user', content: message }));
      thread = result.history;

      // remove Thinking if trace never fired (trace removes it on first event)
      ensureThinkingRemoved();

      // test error
      if (isErrorTest) throw new Error("Test error");

      // add "assistant" response
      chatBubble(result.finalOutput || "", "assistant");
    } catch (err) {
      ensureThinkingRemoved();
      chatBubble("Error: " + err.message, "error");
    }
    prompt();
  });
}




/* =================================
  INTRODUCTION
================================= */
console.log((" ===== Todo List Assistant ===== " as any).bgCyan.black.bold);
console.log(("Type 'exit' or 'quit' or submit an empty message to end.\n" as any).dim);




/* =================================
  INITIALIZE PROMPT
================================= */
prompt();
