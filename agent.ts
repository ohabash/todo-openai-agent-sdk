import "dotenv/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("colors");
import { z } from "zod";
import { Agent, run, tool } from "@openai/agents";
import { chatBubble, createPromptInput } from "./terminal-components";
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
Returns "Added: {item}" on success, "warning: Item already exists." if duplicate.`,
  parameters: z.object({ item: z.string() }),
  execute: async ({ item }) => todoService.add(item),
});

// remove_task — marks task complete (same behavior, different name for "remove" / "clear" requests)
const removeTaskTool = tool({
  name: "remove_task",
  description: `Remove or clear a task from the list. Marks it complete (does not delete).
Use when the user says: "remove X", "clear X", "delete X", "get rid of X".
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".
Returns "Completed: {title}" on success, "Error: Task not found." if not found.`,
  parameters: z.object({ idOrTitle: z.union([z.number(), z.string()]) }),
  execute: async ({ idOrTitle }) => todoService.complete(idOrTitle),
});

// complete_task — marks task complete (for "done" / "complete" / "finish" requests)
const completeTaskTool = tool({
  name: "complete_task",
  description: `Mark a task as done/complete.
Use when the user says: "complete X", "finish X", "done with X", "mark X done".
Accepts task ID (number) or title (string). Fuzzy: "haircut" matches "haircut at 10am".
Returns "Completed: {title}" on success, "Error: Task not found." if not found.`,
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
// create agent
const agent = new Agent({
  name: "Todo List Assistant",
  instructions: `You are my helpful assistant. Help manage tasks using the tools.
Only claim success when a tool actually returns success. Prefer format_list over list_todos for display.`,
  tools: [addTodoTool, removeTaskTool, completeTaskTool, listTodosTool, formatListTool],
  toolUseBehavior: {
    stopAtToolNames: ["add_todo", "remove_task", "complete_task", "list_todos", "format_list"],
  },
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
      // add "thinking" bubble
      const { remove } = chatBubble("Thinking...", "loading");

      // run agent
      const result = await run(agent, message);

      // remove "thinking" bubble
      if (remove) remove();

      // test error
      if (isErrorTest) throw new Error("Test error");

      // add "assistant" response
      chatBubble(result.finalOutput || "", "assistant");
    } catch (err) {
      // add "error" response
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
