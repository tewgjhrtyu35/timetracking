import type { TimeEntry, TimeEntryDraft } from "../types";

export interface ApiAdapter {
  listEntries(): Promise<TimeEntry[]>;
  addEntry(draft: TimeEntryDraft): Promise<TimeEntry>;
}

export const webAdapter: ApiAdapter = {
  async listEntries(): Promise<TimeEntry[]> {
    const raw = localStorage.getItem("timetracking-entries");
    if (!raw) return [];
    try {
      return JSON.parse(raw) as TimeEntry[];
    } catch (e) {
      console.error("Failed to parse entries", e);
      return [];
    }
  },

  async addEntry(draft: TimeEntryDraft): Promise<TimeEntry> {
    const entries = await this.listEntries();
    const newEntry: TimeEntry = {
      ...draft,
      id: crypto.randomUUID(),
      category: draft.category.trim(),
    };
    const updated = [newEntry, ...entries];
    localStorage.setItem("timetracking-entries", JSON.stringify(updated));
    return newEntry;
  },
};

