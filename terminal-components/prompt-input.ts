import * as readline from "readline";

const BOX_WIDTH = 50;

export function createPromptInput() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  function render() {
    const top = "╭─ prompt " + "─".repeat(BOX_WIDTH - 8) + "╮\n";
    const promptLine = "│ > ";
    process.stdout.write(top + promptLine);
  }

  const PROMPT_LINES = 2; // top, content

  function close(input: string) {
    // Remove the prompt box from the screen
    const moveUp = "\x1b[A";
    const clearLine = "\x1b[2K";
    for (let i = 0; i < PROMPT_LINES; i++) {
      process.stdout.write(moveUp + clearLine);
    }
  }

  function question(callback: (input: string) => void) {
    render();
    rl.question("", (input) => {
      close(input);
      callback(input);
    });
  }

  return { question, rl };
}
