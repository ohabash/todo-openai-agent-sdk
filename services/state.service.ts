import fs from "fs";
import path from "path";
import type { AppState } from "../types";

/**
 * Persists app state to JSON. Single source of truth.
 */
export class StateService<T extends object = AppState> {
  private filePath: string;
  private state: T;

  constructor(
    filename: string = "state.json",
    private defaultState: T,
  ) {
    this.filePath = path.resolve(process.cwd(), filename);
    this.state = this.load();
  }

  private load(): T {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw) as T;
      }
    } catch {
      console.warn("Failed to read state. Using default.");
    }

    this.save(this.defaultState);
    return this.defaultState;
  }

  private save(state: T) {
    fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  public get(): T {
    return this.state;
  }

  public set(newState: T): void {
    this.state = newState;
    this.save(this.state);
  }

  public update(updates: Partial<T>): void {
    this.state = { ...this.state, ...updates };
    this.save(this.state);
  }
}
