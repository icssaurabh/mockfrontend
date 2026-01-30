import { http } from "./http";

export type Task = {
  id: string; // keep same as your current code
  title: string;
  priority: string;
  status: string;
};

const BASE = "http://localhost:3001/tasks";

export const TasksAPI = {
  list: () => http<Task[]>(BASE),

  create: (payload: Pick<Task, "title" | "priority" | "status">) =>
    http<Task>(BASE, { method: "POST", body: payload }),

  update: (id: Task["id"], updates: Partial<Pick<Task, "priority" | "status">>) =>
    http<Task>(`${BASE}/${id}`, { method: "PATCH", body: updates }),

  remove: (id: Task["id"]) => http<void>(`${BASE}/${id}`, { method: "DELETE" }),
};
