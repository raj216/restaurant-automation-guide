import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// Builds the brand kit in client/src/kit as a standalone library: the
// components as kit/dist/index.js and the site stylesheet they are drawn with
// as kit/dist/kadmivo.css. The design-system sync (.design-sync/) reads this
// build; the site itself is built by vite.config.ts.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Same root as the site build, so Tailwind scans the same sources and the
  // stylesheet comes out the same.
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: false,
  build: {
    outDir: path.resolve(import.meta.dirname, "kit/dist"),
    emptyOutDir: true,
    // Readable output: the sync re-bundles it anyway.
    minify: false,
    lib: {
      entry: path.resolve(import.meta.dirname, "client/src/kit/lib.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "kadmivo",
    },
    rollupOptions: {
      external: [/^react(-dom)?(\/.*)?$/, "framer-motion", "lucide-react"],
    },
  },
});
