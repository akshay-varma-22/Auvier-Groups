import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Relative asset paths: the built site works at a domain root or in a subfolder.
  base: "./",
  plugins: [react()],
  server: { port: 5173 },
  build: {
    rolldownOptions: {
      // One page per company in the group.
      input: {
        group: resolve(root, "index.html"),
        technologies: resolve(root, "technologies/index.html"),
        clothing: resolve(root, "clothing/index.html"),
      },
    },
  },
});
