export type TimeEntry = {
  id: string;
  startedAt: string; // ISO
  stoppedAt: string; // ISO
  durationMs: number;
  category: string;
};

export type TimeEntryDraft = Omit<TimeEntry, "id">;

export type CategoryTotal = {
  category: string;
  durationMs: number;
};


