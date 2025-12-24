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


