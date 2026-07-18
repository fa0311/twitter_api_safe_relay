import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { addEntrypoint, defineWxtModule } from "wxt/modules";

const require = createRequire(import.meta.url);
const setupPath = require.resolve("twitter-api-safe-inject/setup.js");
const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";
const bridgePath = fileURLToPath(new URL(`./entrypoints/bridge.${extension}`, import.meta.url));
const matches = ["https://x.com/*", "https://*.x.com/*", "https://twitter.com/*", "https://*.twitter.com/*"];

export default defineWxtModule({
	name: "twitter-api-safe-wxt",
	async setup(wxt) {
		addEntrypoint(wxt, {
			type: "unlisted-script",
			name: "twitter-api-safe/bridge",
			inputPath: bridgePath,
			outputDir: wxt.config.outDir,
			options: await wxt.builder.importEntrypoint(bridgePath),
		});

		wxt.hooks.hook("build:publicAssets", async (_wxt, assets) => {
			assets.push({ relativeDest: "twitter-api-safe/setup.js", contents: await readFile(setupPath, "utf8") });
		});

		wxt.hooks.hook("build:manifestGenerated", (_wxt, manifest) => {
			manifest.web_accessible_resources ??= [];
			manifest.web_accessible_resources.push({
				resources: ["twitter-api-safe/setup.js", "twitter-api-safe/bridge.js"],
				matches,
			});
		});
	},
});
