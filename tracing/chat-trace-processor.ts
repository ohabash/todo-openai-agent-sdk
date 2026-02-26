import type { TracingProcessor } from "@openai/agents";
import type { Span, Trace } from "@openai/agents";
import { traceBubble } from "../terminal-components/trace-bubble";

const DIM_ITALIC = "\x1b[2m\x1b[3m";
const RESET = "\x1b[0m";

const TOOL_SUMMARIES: Record<string, string> = {
  add_todo: "adding item",
  remove_task: "removing task",
  complete_task: "completing task",
  list_todos: "listing tasks",
  format_list: "formatting list",
};

let clearThinking: (() => void) | null = null;
export function setClearThinking(fn: (() => void) | null): void {
  clearThinking = fn;
}
/** Call after run to remove Thinking if trace never fired. */
export function ensureThinkingRemoved(): void {
  if (clearThinking) {
    clearThinking();
    clearThinking = null;
  }
}

function toolSummary(name: string): string {
  return TOOL_SUMMARIES[name] ?? name;
}

export function createChatTraceProcessor(): TracingProcessor {
  return {
    async onTraceStart(trace: Trace): Promise<void> {
      if (clearThinking) {
        clearThinking();
        clearThinking = null;
      }
      traceBubble(`${DIM_ITALIC}trace — started${RESET}`, "trace");
    },

    async onTraceEnd(_trace: Trace): Promise<void> {},

    async onSpanStart(_span: Span<any>): Promise<void> {},

    async onSpanEnd(span: Span<any>): Promise<void> {
      const data = span.spanData as { type: string; name?: string };
      if (!data) return;

      if (data.type === "function") {
        const summary = toolSummary(data.name || "tool");
        traceBubble(`${DIM_ITALIC}tool — ${summary}${RESET}`, "tool");
      } else if (data.type === "agent") {
        traceBubble(`${DIM_ITALIC}agent — ${data.name || "agent"}${RESET}`, "agent");
      } else if (data.type === "generation") {
        traceBubble(`${DIM_ITALIC}llm — generation${RESET}`, "generation");
      }
    },

    async shutdown(): Promise<void> {},
    async forceFlush(): Promise<void> {},
  };
}
