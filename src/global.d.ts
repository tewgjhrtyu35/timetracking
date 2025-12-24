import type { TimeEntry, TimeEntryDraft } from "./types";

declare global {
  interface Window {
    api: {
      listEntries: () => Promise<TimeEntry[]>;
      addEntry: (entry: TimeEntryDraft) => Promise<TimeEntry>;
      updateEntry: (entry: TimeEntry) => Promise<void>;
      deleteEntry: (id: string) => Promise<void>;
    };
  }
}

export {};


