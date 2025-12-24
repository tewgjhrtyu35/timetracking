import { webAdapter, type ApiAdapter } from "./web";

// Access the Electron bridge if it exists
const electronApi = window.api as ApiAdapter | undefined;

// If window.api is present, we are in Electron. Otherwise use Web/LocalStorage.
export const api: ApiAdapter = electronApi || webAdapter;

