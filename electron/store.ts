import Store from "electron-store";
import type { TimeEntry, TimeEntryDraft } from "../src/types";
import { randomUUID } from "crypto";

type Schema = {
  entries: TimeEntry[];
};

const store = new Store<Schema>({
  name: "timetracking",
  defaults: {
    entries: [],
  },
});

export function listEntries(): TimeEntry[] {
  const entries = store.get("entries");
  return Array.isArray(entries) ? entries : [];
}

export function addEntry(draft: TimeEntryDraft): TimeEntry {
  const entry: TimeEntry = {
    id: randomUUID(),
    ...draft,
    category: draft.category.trim(),
  };

  const next = [entry, ...listEntries()];
  store.set("entries", next);
  return entry;
}

export function updateEntry(updated: TimeEntry): void {
  const entries = listEntries();
  const index = entries.findIndex((e) => e.id === updated.id);
  if (index !== -1) {
    entries[index] = updated;
    store.set("entries", entries);
  }
}

export function deleteEntry(id: string): void {
  const entries = listEntries();
  const next = entries.filter((e) => e.id !== id);
  store.set("entries", next);
}


