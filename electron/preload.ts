import { contextBridge, ipcRenderer } from "electron";
import type { TimeEntry, TimeEntryDraft } from "../src/types";

contextBridge.exposeInMainWorld("api", {
  listEntries: (): Promise<TimeEntry[]> => ipcRenderer.invoke("entries:list"),
  addEntry: (draft: TimeEntryDraft): Promise<TimeEntry> =>
    ipcRenderer.invoke("entries:add", draft),
  updateEntry: (entry: TimeEntry): Promise<void> =>
    ipcRenderer.invoke("entries:update", entry),
  deleteEntry: (id: string): Promise<void> =>
    ipcRenderer.invoke("entries:delete", id),
});
