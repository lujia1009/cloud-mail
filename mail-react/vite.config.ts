import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Virevan Mail",
        short_name: "Virevan Mail",
        theme_color: "#f7f9fc",
        background_color: "#f7f9fc",
        display: "standalone",
        icons: [
          {
            src: "/virevan.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/static\//, /^\/(?:mail\/)?attachments\//],
        globPatterns: ["**/*.{js,css,html,svg}"],
        runtimeCaching: [],
      },
    }),
  ],
  base: "/",
  build: { outDir: "../mail-worker/dist", emptyOutDir: true },
  server: { proxy: {
    "/api": "http://localhost:8787",
    "/static/": "http://localhost:8787",
    "/attachments/": "http://localhost:8787",
    "/mail/attachments/": "http://localhost:8787",
  } },
});
