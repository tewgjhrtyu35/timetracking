import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { addEntry, listEntries } from "./store";
import type { TimeEntryDraft } from "../src/types";

// NOTE: We bundle Electron files as CJS (`.cjs`) so Node provides `__dirname` at runtime.
declare const __dirname: string;

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    backgroundColor: "#0b0f17",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    // In production, `dist-electron/main.js` sits next to `dist-electron/preload.js`.
    // Vite output goes to `<projectRoot>/dist`.
    const projectRoot = path.join(__dirname, "..");
    const indexHtml = path.join(projectRoot, "dist", "index.html");
    void win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  ipcMain.handle("entries:list", () => listEntries());
  ipcMain.handle("entries:add", (_evt, draft: TimeEntryDraft) => addEntry(draft));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


