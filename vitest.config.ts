import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { instanceSelection } from "./instances/select";

// Las pruebas usan Casarabonela salvo que se indique otra instancia: sus datos son los de referencia.
export default defineConfig({
  plugins: [react(), instanceSelection({ fallbackId: "casarabonela" })],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
