import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Important for Electron production builds (file://) so asset URLs are relative.
export default defineConfig({
  base: "./",
  plugins: [react()],
});


