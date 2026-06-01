import { defineConfig } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const hasExternalBaseURL = Boolean(process.env.PLAYWRIGHT_BASE_URL);
const port = Number(process.env.PLAYWRIGHT_PORT ?? (isCi ? 3100 : 4444));
const host = "127.0.0.1";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://${host}:${port}`;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  retries: 1,
  use: {
    baseURL,
    headless: true,
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  webServer: hasExternalBaseURL
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ??
          `npm run dev -- --hostname ${host} --port ${port}`,
        port,
        reuseExistingServer: !isCi,
        timeout: 120_000,
      },
});
