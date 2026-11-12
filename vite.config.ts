import { defineConfig } from "vite";

const allowedHost = process.env.VITE_ALLOWED_HOST;

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    ...(allowedHost ? { allowedHosts: [allowedHost] } : {}),
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
  },
});
