import boxen from "boxen";

export type TraceEventKind = "tool" | "agent" | "generation" | "trace";

export function traceBubble(message: string, kind: TraceEventKind): void {
  const options: Record<string, unknown> = {
    padding: { top: 0, right: 1, bottom: 0, left: 1 },
    margin: { top: 0, right: 1, bottom: 0, left: 1 },
    borderStyle: "single",
    textAlignment: "right",
    titleAlignment: "left",
    float: "right",
    dimBorder: true,
  };

  if (kind === "tool") {
    options.borderColor = "yellow";
    options.title = "🔧 tool";
  } else if (kind === "agent") {
    options.borderColor = "cyan";
    options.title = "🤖 agent";
  } else if (kind === "generation") {
    options.borderColor = "gray";
    options.title = "💭 llm";
  } else {
    options.borderColor = "gray";
    options.title = "📋 trace";
  }

  const output = boxen(message, options as any);
  console.log(output);
}
