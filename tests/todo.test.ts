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
  return { todoService };
}

describe("TodoService", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH);
  });

  afterAll(() => {
    if (fs.existsSync(TEST_STATE_PATH)) fs.unlinkSync(TEST_STATE_PATH);
  });

  describe("Duplicate detection", () => {
    it("rejects adding duplicate when task exists and is open", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const res = todoService.add("Buy Milk");
      expect(res).toContain("already");
      expect(todoService.get()).toHaveLength(1);
    });

    it("reactivates when duplicate exists but is completed", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.complete("Buy Milk");
      todoService.add("Buy Milk");
      const t = todoService.get().find((x) => x.title === "Buy Milk");
      expect(t?.completed).toBe(false);
    });
  });

  describe("Raw JSON listing", () => {
    it("returns array of { task, status } objects", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.add("Email Team");
      const list = todoService.list();
      expect(Array.isArray(list)).toBe(true);
      expect(list).toEqual([
        { task: "Buy Milk", status: "open" },
        { task: "Email Team", status: "open" },
      ]);
    });

    it("status is 'complete' for completed tasks", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.complete("Buy Milk");
      const list = todoService.list();
      expect(list).toEqual([{ task: "Buy Milk", status: "complete" }]);
    });

    it("is JSON-serializable", () => {
      const { todoService } = createServices();
      todoService.add("A");
      const list = todoService.list();
      expect(() => JSON.stringify(list)).not.toThrow();
      expect(JSON.parse(JSON.stringify(list))).toEqual(list);
    });
  });

  describe("Formatted list output", () => {
    it("shows open tasks with ⬜ and completed with ✅", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.add("Email Team");
      todoService.complete("Buy Milk");
      const formatted = todoService.format();
      expect(formatted).toContain("Here are your tasks");
      expect(formatted).toContain("✅");
      expect(formatted).toContain("Buy Milk");
      expect(formatted).toContain("⬜");
      expect(formatted).toContain("Email Team");
    });

    it("sorts completed tasks below open", () => {
      const { todoService } = createServices();
      todoService.add("A");
      todoService.add("B");
      todoService.complete("A");
      const formatted = todoService.format();
      expect(formatted.indexOf("⬜")).toBeLessThan(formatted.indexOf("✅"));
    });

    it("shows (no tasks) when empty", () => {
      const { todoService } = createServices();
      const formatted = todoService.format();
      expect(formatted).toContain("(no tasks)");
    });
  });

  describe("Workflow sequence", () => {
    it("add → add → complete → list reflects correct state", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.add("Email Team");
      todoService.complete("Buy Milk");
      const list = todoService.list();
      expect(list).toHaveLength(2);
      expect(list.find((l) => l.task === "Buy Milk")?.status).toBe("complete");
      expect(list.find((l) => l.task === "Email Team")?.status).toBe("open");
    });

    it("add → complete → format shows mixed open and done", () => {
      const { todoService } = createServices();
      todoService.add("A");
      todoService.add("B");
      todoService.complete("A");
      const formatted = todoService.format();
      expect(formatted).toMatch(/⬜/);
      expect(formatted).toMatch(/✅/);
    });
  });

  describe("complete", () => {
    it("fuzzy match: partial name finds task", () => {
      const { todoService } = createServices();
      todoService.add("haircut at 10am");
      const res = todoService.complete("haircut");
      expect(res).toContain("Completed: haircut at 10am");
    });

    it("returns error when not found", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      const res = todoService.complete("xyz");
      expect(res).toBe("Error: Task not found.");
    });

    it("returns error when multiple matches", () => {
      const { todoService } = createServices();
      todoService.add("Buy Milk");
      todoService.add("Buy groceries");
      const res = todoService.complete("Buy");
      expect(res).toContain("Multiple matches");
    });
  });
});
