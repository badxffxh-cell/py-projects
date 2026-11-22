import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // same dev-server convention as Lovable's Vite projects
  server: { host: "::", port: 8080 },
  build: {
    // three.js + R3F live in their own lazily loaded chunk
    chunkSizeWarningLimit: 1600,
  },
});
