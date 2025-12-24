import { contextBridge, ipcRenderer } from "electron";
import type { TimeEntry, TimeEntryDraft } from "../src/types";

contextBridge.exposeInMainWorld("api", {
  listEntries: (): Promise<TimeEntry[]> => ipcRenderer.invoke("entries:list"),
  addEntry: (draft: TimeEntryDraft): Promise<TimeEntry> =>
    ipcRenderer.invoke("entries:add", draft),
});


