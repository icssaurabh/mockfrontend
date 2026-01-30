"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, RotateCcw, Trash2, Plus } from "lucide-react";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
};

type ToastType = "success" | "error" | "info";

const API = "http://localhost:3001/tasks";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Pick<Task, "priority" | "status">>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Toast
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);
  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  };

  // Add popup
  const [isAddOpen, setIsAddOpen] = useState(false);

  // POST form
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("Low");
  const [newStatus, setNewStatus] = useState("open");

  // Filters
  const [q, setQ] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setErr("");

      const res = await fetch(API, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: Task[] = await res.json();
      setTasks(data);

      const d: Record<string, Pick<Task, "priority" | "status">> = {};
      data.forEach((t) => {
        d[t.id] = { priority: t.priority, status: t.status };
      });
      setDrafts(d);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to fetch";
      setErr(msg);
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("error", "Title is required");
      return;
    }

    try {
      setErr("");
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          priority: newPriority,
          status: newStatus,
        }),
      });

      if (!res.ok) throw new Error(`POST failed: HTTP ${res.status}`);

      setNewTitle("");
      setNewPriority("Low");
      setNewStatus("open");

      setIsAddOpen(false); // close popup on success
      showToast("success", "Task added successfully");
      await fetchTasks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create task";
      setErr(msg);
      showToast("error", msg);
    }
  };

  const onDraftChange = (id: string, field: "priority" | "status", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || { priority: "Low", status: "open" }), [field]: value },
    }));
  };

  const saveTask = async (id: string) => {
    const current = tasks.find((t) => t.id === id);
    const draft = drafts[id];
    if (!current || !draft) return;

    const updates: Partial<Pick<Task, "priority" | "status">> = {};
    if (draft.priority !== current.priority) updates.priority = draft.priority;
    if (draft.status !== current.status) updates.status = draft.status;

    if (Object.keys(updates).length === 0) {
      showToast("info", "No changes to save");
      return;
    }

    try {
      setErr("");
      const res = await fetch(`${API}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error(`PATCH failed: HTTP ${res.status}`);

      showToast("success", "Task updated successfully");
      await fetchTasks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update task";
      setErr(msg);
      showToast("error", msg);
    }
  };

  const resetRow = (id: string) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    setDrafts((prev) => ({
      ...prev,
      [id]: { priority: current.priority, status: current.status },
    }));

    showToast("info", "Changes reset");
  };

  // DELETE (with custom alert instead of confirm)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      setErr("");
      const res = await fetch(`${API}/${pendingDeleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE failed: HTTP ${res.status}`);

      showToast("success", "Task deleted successfully");
      setConfirmOpen(false);
      setPendingDeleteId(null);
      await fetchTasks();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete task";
      setErr(msg);
      showToast("error", msg);
    }
  };

  const priorities = useMemo(() => {
    const set = new Set(tasks.map((t) => t.priority));
    return ["All", ...Array.from(set)];
  }, [tasks]);

  const statuses = useMemo(() => {
    const set = new Set(tasks.map((t) => t.status));
    return ["All", ...Array.from(set)];
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = q.trim().toLowerCase();

    return tasks.filter((t) => {
      const matchesQuery = query ? t.title.toLowerCase().includes(query) : true;
      const matchesPriority = priorityFilter === "All" ? true : t.priority === priorityFilter;
      const matchesStatus = statusFilter === "All" ? true : t.status === statusFilter;
      return matchesQuery && matchesPriority && matchesStatus;
    });
  }, [tasks, q, priorityFilter, statusFilter]);

  const resetFilters = () => {
    setQ("");
    setPriorityFilter("All");
    setStatusFilter("All");
    showToast("info", "Filters reset");
  };

  const openAddPopup = () => {
    // reset the form each time popup opens
    setNewTitle("");
    setNewPriority("Low");
    setNewStatus("open");
    setIsAddOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`flex items-start gap-3 rounded-2xl px-4 py-3 shadow-lg ring-1 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : toast.type === "error"
                ? "bg-red-50 text-red-800 ring-red-200"
                : "bg-blue-50 text-blue-800 ring-blue-200"
            }`}
          >
            <div className="text-sm font-semibold">{toast.message}</div>

            <button
              onClick={() => setToast(null)}
              className="ml-2 rounded-lg px-2 py-1 text-xs font-bold hover:bg-black/5"
              aria-label="Close toast"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Add Task Popup */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-zinc-200 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Add Task</h2>
                <p className="mt-1 text-sm text-zinc-600">Create a new task with priority and status.</p>
              </div>

              <button
                onClick={() => setIsAddOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                aria-label="Close add task dialog"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={addTask} className="mt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-600">Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter task title"
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-600">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                  >
                    <option value="open">open</option>
                    <option value="In-Progress">In-Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Alert */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl ring-1 ring-zinc-200 sm:p-6">
            <h3 className="text-lg font-semibold text-zinc-900">Delete task?</h3>
            <p className="mt-2 text-sm text-zinc-600">This action cannot be undone.</p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={cancelDelete}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 active:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tasks</h1>
            <p className="text-sm text-zinc-600">Title is read-only. Update priority/status and Save.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openAddPopup}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 active:bg-zinc-950"
            >
              <Plus size={18} />
              Add Task
            </button>

           
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Filters</h2>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            />

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status */}
        {loading && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
            <p className="text-sm text-zinc-700">Loading...</p>
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Error: {err}
          </div>
        )}

        {/* List */}
        {!loading && (
          <div className="mt-4">
             <div className="flex mb-5">
 <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm shadow-sm ring-1 ring-zinc-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-700">
                Showing <b>{filteredTasks.length}</b> of <b>{tasks.length}</b>
              </span>
            </div>
             </div>
            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredTasks.map((t) => {
                const d = drafts[t.id] || { priority: t.priority, status: t.status };
                const changed = d.priority !== t.priority || d.status !== t.status;

                return (
                  <div key={t.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-500">ID</p>
                        <p className="font-mono text-sm text-zinc-900">{t.id}</p>
                      </div>

                      <button
                        onClick={() => requestDelete(t.id)}
                        title="Delete"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-zinc-500">Title</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{t.title}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-zinc-500">Priority</p>
                        <select
                          value={d.priority}
                          onChange={(e) => onDraftChange(t.id, "priority", e.target.value)}
                          className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                        >
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                        </select>
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">Status</p>
                        <select
                          value={d.status}
                          onChange={(e) => onDraftChange(t.id, "status", e.target.value)}
                          className="mt-1 h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                        >
                          <option value="open">open</option>
                          <option value="In-Progress">In-Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => saveTask(t.id)}
                        disabled={!changed}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white ${
                          changed ? "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950" : "bg-zinc-400 cursor-not-allowed"
                        }`}
                      >
                        <Save size={18} />
                        Save
                      </button>

                      <button
                        onClick={() => resetRow(t.id)}
                        disabled={!changed}
                        className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
                          changed
                            ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                            : "border-zinc-200 bg-white text-zinc-400 cursor-not-allowed"
                        }`}
                      >
                        <RotateCcw size={18} />
                        Reset
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200 lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead className="bg-zinc-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Title </th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-100">
                    {filteredTasks.map((t) => {
                      const d = drafts[t.id] || { priority: t.priority, status: t.status };
                      const changed = d.priority !== t.priority || d.status !== t.status;

                      return (
                        <tr key={t.id} className="text-sm">
                          <td className="px-4 py-3 font-mono text-zinc-700">{t.id}</td>
                          <td className="px-4 py-3 font-semibold text-zinc-900">{t.title}</td>

                          <td className="px-4 py-3">
                            <select
                              value={d.priority}
                              onChange={(e) => onDraftChange(t.id, "priority", e.target.value)}
                              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                            >
                              <option>Low</option>
                              <option>Medium</option>
                              <option>High</option>
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              value={d.status}
                              onChange={(e) => onDraftChange(t.id, "status", e.target.value)}
                              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                            >
                              <option value="open">open</option>
                              <option value="In-Progress">In-Progress</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveTask(t.id)}
                                disabled={!changed}
                                title="Save"
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                                  changed ? "bg-zinc-900 text-white hover:bg-zinc-800" : "bg-zinc-400 text-white cursor-not-allowed"
                                }`}
                              >
                                <Save size={18} />
                              </button>

                              <button
                                onClick={() => resetRow(t.id)}
                                disabled={!changed}
                                title="Reset"
                                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                                  changed
                                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                                    : "border-zinc-200 bg-white text-zinc-400 cursor-not-allowed"
                                }`}
                              >
                                <RotateCcw size={18} />
                              </button>

                              <button
                                onClick={() => requestDelete(t.id)}
                                title="Delete"
                                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
           
            {!loading && filteredTasks.length === 0 && (
              <div className="mt-4 rounded-2xl bg-white p-6 text-sm text-zinc-700 shadow-sm ring-1 ring-zinc-200">
                No tasks found for current filters.
              </div>
            )}
          </div>
          
        )}
      </div>
    </div>
  );
}
