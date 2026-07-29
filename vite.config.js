import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "node:fs";
import process from "node:process";

const vercelConfig = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8")
);
const globalHeaders = Object.fromEntries(
  vercelConfig.headers
    .find(({ source }) => source === "/(.*)")
    .headers.map(({ key, value }) => [key, value])
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const r2BaseUrl = String(env.VITE_R2_PUBLIC_BASE_URL || "").trim();
  const hasR2BaseUrl = /^https?:\/\//i.test(r2BaseUrl);

  return {
    plugins: [react(), tailwindcss()],
    preview: {
      headers: globalHeaders,
    },
    server: hasR2BaseUrl
      ? {
          proxy: {
            "/__r2_proxy": {
              target: r2BaseUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/__r2_proxy/, ""),
            },
          },
        }
      : undefined,
  };
});
