import type { TimeEntry, TimeEntryDraft } from "./types";

declare global {
  interface Window {
    api: {
      listEntries: () => Promise<TimeEntry[]>;
      addEntry: (entry: TimeEntryDraft) => Promise<TimeEntry>;
    };
  }
}

export {};


