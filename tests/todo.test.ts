import { describe, it, expect, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import { StateService, TodoService } from "../services";
import { DEFAULT_APP_STATE } from "../types";

const TEST_STATE_PATH = path.resolve(process.cwd(), "state.test.json");

function createServices() {
  fs.writeFileSync(TEST_STATE_PATH, JSON.stringify(DEFAULT_APP_STATE, null, 2));
  const stateService = new StateService(TEST_STATE_PATH, DEFAULT_APP_STATE);
  const todoService = new TodoService(stateService);
  return { stateService, todoService };
}

describe("TodoService", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH);
  });

  describe("get", () => {
    it("returns todos from state", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const todos = todoService.get();
      expect(todos).toHaveLength(1);
      expect(todos[0].title).toBe("Buy Milk");
    });

    it("returns empty array when no todos", () => {
      const { todoService } = createServices();
      expect(todoService.get()).toEqual([]);
    });
  });

  describe("list", () => {
    it("returns task and status for each todo", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const list = todoService.list();
      expect(list).toEqual([{ task: "Buy Milk", status: "open" }]);
    });

    it("state reflects list structure", () => {
      const { todoService } = createServices();
      todoService.add("A");
      todoService.add("B");
      const list = todoService.list();
      const todos = todoService.get();
      expect(list.length).toBe(todos.length);
      expect(list.every((l, i) => l.task === todos[i].title)).toBe(true);
    });
  });

  describe("format", () => {
    it("returns formatted string with open/completed markers", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const formatted = todoService.format();
      expect(formatted).toContain("⬜ Buy Milk");
      expect(formatted).toContain("Here are your tasks");
    });

    it("shows completed tasks with checkmark", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.complete("Buy Milk");
      const formatted = todoService.format();
      expect(formatted).toContain("✅ Buy Milk");
    });
  });

  describe("add", () => {
    it("adds item and returns Added message", () => {
      const { todoService } = createServices();
      const res = todoService.add("Buy Milk");
      expect(res).toContain("Added: Buy Milk");
      expect(todoService.get()).toHaveLength(1);
      expect(todoService.get()[0].title).toBe("Buy Milk");
    });

    it("rejects duplicate (already exists, not completed)", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const res = todoService.add("Buy Milk");
      expect(res).toContain("already");
      expect(todoService.get()).toHaveLength(1);
    });

    it("reactivates completed duplicate", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.complete("Buy Milk");
      todoService.add("Buy Milk");
      const todos = todoService.get();
      const t = todos.find((x) => x.title === "Buy Milk");
      expect(t?.completed).toBe(false);
    });
  });

  describe("complete", () => {
    it("marks task complete and returns message", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const res = todoService.complete("Buy Milk");
      expect(res).toContain("Completed: Buy Milk");
      expect(todoService.get()[0].completed).toBe(true);
    });

    it("fuzzy match: partial name finds task", () => {
      const { todoService } = createServices();
      todoService.add("haircut at 10am");
      const res = todoService.complete("haircut");
      expect(res).toContain("Completed: haircut at 10am");
      expect(todoService.get()[0].completed).toBe(true);
    });

    it("returns error when not found", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const res = todoService.complete("xyz");
      expect(res).toBe("Error: Task not found.");
      expect(todoService.get()[0].completed).toBe(false);
    });

    it("returns error when multiple matches", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.add("Buy groceries");
      const res = todoService.complete("Buy");
      expect(res).toContain("Multiple matches");
      expect(res).toContain("Buy Milk");
      expect(res).toContain("Buy groceries");
    });
  });
});
