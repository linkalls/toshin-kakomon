import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    permissions: ["downloads", "storage"],
    host_permissions: [
      "*://www.toshin.com/*",
      "*://archive.toshin.com/*",
      "*://www.toshin-kakomon.com/*",
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
  },
});
