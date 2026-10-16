import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"./e2e", workers:1, timeout:90_000,
 use:{baseURL:process.env.DEPLOY_URL || "http://127.0.0.1:8791", headless:true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL}: {})},
 webServer:process.env.DEPLOY_URL ? undefined : {command:"node node_modules/wrangler/bin/wrangler.js dev --port 8791", url:"http://127.0.0.1:8791", timeout:60_000, reuseExistingServer:false},
 reporter:[["list"]],
});
