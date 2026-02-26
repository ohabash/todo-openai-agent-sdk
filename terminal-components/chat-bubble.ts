import boxen from "boxen";

export type ChatBubbleRole = "user" | "assistant" | "tool" | "loading" | "error" | "success" | "warning";
export type BubbleResp = {
  remove?: () => void;
};

export function chatBubble(message: string, role: ChatBubbleRole): BubbleResp {
  const options: any = {
    padding: 1,
    margin: 1,
    borderStyle: "round",
    textAlignment: "left",
  };

  if (role === "user") {
    options.borderColor = "blue";
    options.title = "👤 You";
    options.titleAlignment = "right";
    options.float = "right";
  } else if (role === "assistant") {
    options.borderColor = "green";
    options.title = "🤖 Assistant";
    options.titleAlignment = "left";
    options.float = "left";
  } else if (role === "tool") {
    options.borderColor = "yellow";
    options.title = "🔧 Tool";
    options.titleAlignment = "center";
    options.borderStyle = "classic";
  } else if (role === "loading") {
    options.borderColor = "gray";
    options.dimBorder = true;
    options.title = "💭 Thinking...";
    options.titleAlignment = "center";
    options.borderStyle = "classic";
  } else if (role === "error") {
    options.borderColor = "red";
    options.title = "🚨 Error";
    options.titleAlignment = "left";
    options.borderStyle = "classic";
  } else if (role === "success") {
    options.borderColor = "green";
    options.title = "✅ Success";
    options.titleAlignment = "left";
    options.borderStyle = "classic";
  } else if (role === "warning") {
    options.borderColor = "yellow";
    options.title = "⚠️ Warning";
    options.titleAlignment = "left";
  }

  const output = boxen(message, options);
  const lineCount = output.split("\n").length;

  console.log(output);

  return {
    remove: () => {
      const moveUp = "\x1b[A";
      const clearLine = "\x1b[2K";
      for (let i = 0; i < lineCount; i++) {
        process.stdout.write(moveUp + clearLine);
      }
    },
  };
}