import type { Todo } from "../types";
import type { StateService } from "./state.service";

/** Find todo by id or title. Exact match first, then fuzzy (substring). */
function findTodoByIdOrTitle(
  todos: Todo[],
  idOrTitle: number | string
): { todo?: Todo; error?: string } {
  const input = String(idOrTitle).trim();

  if (typeof idOrTitle === "number") {
    const todo = todos.find((t) => t.id === idOrTitle);
    return todo ? { todo } : {};
  }

  const lower = input.toLowerCase();
  const exact = todos.find((t) => t.title.toLowerCase() === lower);
  if (exact) return { todo: exact };

  const matches = todos.filter((t) => t.title.toLowerCase().includes(lower));
  if (matches.length === 1) return { todo: matches[0] };
  if (matches.length > 1)
    return { error: `Error: Multiple matches (${matches.map((m) => m.title).join(", ")}). Be more specific.` };

  return {};
}

/**
 * Todo operations. Always reads from latest state.
 */
export class TodoService {
  constructor(private stateService: StateService) {}

  // get fresh todos from state
  get(): Todo[] {
    return this.stateService.get().todos;
  }

  // json
  list(): { task: string; status: string }[] {
    return this.get().map((t) => ({
      task: t.title,
      status: t.completed ? "complete" : "open",
    }));
  }

  // format
  format(): string {
    const list = (
      this.get()
        .sort((a, b) => a.completed ? 1 : b.completed ? -1 : 0)
        .map((t) => (t.completed ? `✅ ${t.title}` : `⬜ ${t.title}`))
        .join("\n") || "(no tasks)"
    );
    return `Here are your tasks:\n\n${list}`;
  }

  // add
  add(item: string): string {
    const todos = this.get();
    const title = item.trim();

    // exists and not completed
    if (todos.some((t) => t.title.toLowerCase() === title.toLowerCase() && !t.completed)) {
      return `warning: ⚠️  Item already "${title}" exists.\n\n${this.format()}`;
    }

    // exists and completed
    if (todos.some((t) => t.title.toLowerCase() === title.toLowerCase() && t.completed)) {
      let todo = todos.find((t) => t.title.toLowerCase() === title.toLowerCase() && t.completed);
      if (todo) {
        todo.completed = false;
        this.stateService.update({ todos });
      }
      return `warning: ⚠️  The completed item "${title}" already exists. I went ahead and activated it again!\n\n${this.format()}`;
    }

    const nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    const newTodo: Todo = { id: nextId, title, completed: false };

    this.stateService.update({ todos: [...todos, newTodo] });
    return `Added: ${title}\n\n${this.format()}`;
  }

  // mark complete by id or title. fuzzy: "haircut" matches "haircut at 10am"
  complete(idOrTitle: number | string): string {
    const todos = this.get();
    const result = findTodoByIdOrTitle(todos, idOrTitle);

    if (result.error) return result.error;
    if (!result.todo) return "Error: Task not found.";

    const todo = result.todo;
    todo.completed = true;
    this.stateService.update({ todos: [...todos] });
    return `Completed: ${todo.title}\n\n${this.format()}`;
  }
}
