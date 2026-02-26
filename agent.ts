import "dotenv/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("colors");
import { z } from "zod";
import { Agent, addTraceProcessor, Runner, run, setTracingDisabled, tool } from "@openai/agents";
import { chatBubble, createPromptInput } from "./terminal-components";
import { createChatTraceProcessor, ensureThinkingRemoved, setClearThinking } from "./tracing/chat-trace-processor";

// trace tool calls and major events in chat (force on; SDK disables when NODE_ENV=test)
setTracingDisabled(false);
addTraceProcessor(createChatTraceProcessor());
const runner = new Runner({ tracingDisabled: false });
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
IMPORTANT: Call ONCE PER ITEM. For "add rice cereal milk" make 3 separate calls with item "rice", "cereal", "milk". Never pass multiple items in one call.`,
  parameters: z.object({ item: z.string() }),
  execute: async ({ item }) => todoService.add(item),
});

// remove_task — marks task complete (same behavior, different name for "remove" / "clear" requests)
const removeTaskTool = tool({
  name: "remove_task",
  description: `Remove or clear a task from the list. Marks it complete (does not delete).
Use when the user says: "remove X", "clear X", "delete X", "get rid of X".
IMPORTANT: Call this tool ONCE PER ITEM. For "remove rice milk and sugar" make 3 separate calls: remove_task("rice"), remove_task("milk"), remove_task("sugar"). Never pass multiple items in one call.
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.complete(idOrTitle),
});

// complete_task — marks task complete (for "done" / "complete" / "finish" requests)
const completeTaskTool = tool({
  name: "complete_task",
  description: `Mark a task as done/complete.
Use when the user says: "complete X", "finish X", "done with X", "mark X done".
IMPORTANT: Call this tool ONCE PER ITEM. For "complete rice milk sugar" make 3 separate calls. Never pass multiple items in one call.
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




/* =================================
  AGENT: Todo List Assistant
================================= */
const STOP_AT_TOOLS = ["add_todo", "remove_task", "complete_task", "list_todos", "format_list"];

/** Use LAST matching tool output so all parallel tool calls finish before we return. */
function toolUseBehavior(
  _context: unknown,
  toolResults: Array<{ type: string; tool: { name: string }; output?: unknown }>
) {
  const outputs = toolResults.filter(
    (r) => r.type === "function_output" && STOP_AT_TOOLS.includes(r.tool.name)
  );
  const last = outputs[outputs.length - 1];
  if (last) {
    const out = (last as { output?: unknown }).output;
    return { isFinalOutput: true as const, isInterrupted: undefined, finalOutput: String(out ?? "") };
  }
  return { isFinalOutput: false as const, isInterrupted: undefined };
}

// create agent
const agent = new Agent({
  name: "Todo List Assistant",
  instructions: `You are my helpful assistant. Help manage tasks using the tools.
Only claim success when a tool actually returns success. Prefer format_list over list_todos for display.

When the user asks to add, remove, or complete MULTIPLE items (e.g. "add rice cereal milk" or "remove rice milk and sugar"):
- Call add_todo, remove_task, or complete_task SEPARATELY for EACH item.
- Never combine multiple items in one tool call (e.g. never pass "rice milk" as a single idOrTitle).`,
  tools: [addTodoTool, removeTaskTool, completeTaskTool, listTodosTool, formatListTool],
  toolUseBehavior,
});




/* =================================
  RUN AGENT
================================= */

// create prompt input
const promptInput = createPromptInput();

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
      console.log("Goodbye!");
      promptInput.rl.close();
      process.exit(0);
    }

    // add "user" message
    chatBubble(message, "user");

    // run agent (catch errors)
    try {
      const { remove } = chatBubble("Thinking...", "loading");
      setClearThinking(remove ?? null);

      // run agent (use runner with tracing enabled so trace bubbles show)
      const result = await runner.run(agent, message);

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
