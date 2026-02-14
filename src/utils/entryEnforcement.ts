import type { ApiAdapter } from "../api/web";
import type { TimeEntry, TimeEntryDraft } from "../types";
import {
  CAPPED_CATEGORY_LIMITS_MS,
  computeUsedCappedMsForDay,
  getCappedCategoryKey,
  splitDraftForCapOverflow,
} from "./categoryCaps";

function normalizeDraft(draft: TimeEntryDraft): TimeEntryDraft {
  return {
    ...draft,
    category: draft.category.trim(),
    durationMs: Math.max(0, Math.floor(draft.durationMs)),
  };
}

export async function enforceCappedAdd(
  api: Pick<ApiAdapter, "listEntries" | "addEntry">,
  inputDraft: TimeEntryDraft,
): Promise<TimeEntry[]> {
  const draft = normalizeDraft(inputDraft);
  const cappedCategoryKey = getCappedCategoryKey(draft.category);
  const draftsToPersist: TimeEntryDraft[] = [];

  if (!cappedCategoryKey) {
    draftsToPersist.push(draft);
  } else {
    const entries = await api.listEntries();
    const dayRef = new Date(draft.stoppedAt);
    const usedMs = computeUsedCappedMsForDay(
      entries,
      cappedCategoryKey,
      Number.isNaN(dayRef.getTime()) ? new Date() : dayRef,
    );
    const remainingMs = Math.max(0, CAPPED_CATEGORY_LIMITS_MS[cappedCategoryKey] - usedMs);
    draftsToPersist.push(...splitDraftForCapOverflow(draft, remainingMs));
  }

  const saved: TimeEntry[] = [];
  for (const nextDraft of draftsToPersist) {
    const entry = await api.addEntry(nextDraft);
    saved.push(entry);
  }
  return saved;
}

export async function enforceCappedEdit(
  api: Pick<ApiAdapter, "listEntries" | "addEntry" | "deleteEntry">,
  originalEntryId: string,
  inputDraft: TimeEntryDraft,
): Promise<TimeEntry[]> {
  await api.deleteEntry(originalEntryId);
  await enforceCappedAdd(api, inputDraft);
  return api.listEntries();
}
