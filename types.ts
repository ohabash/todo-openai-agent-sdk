export type ConvoMessage = {
  role: "user" | "assistant";
  content: string;
};

export type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

export type AppState = {
  convo: ConvoMessage[];
  todos: Todo[];
};

export const DEFAULT_APP_STATE: AppState = {
  convo: [],
  todos: [],
};
