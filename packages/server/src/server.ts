import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import { match } from "ts-pattern";
import { createTwitterBrowser } from "twitter-api-safe-request";
import createApp from "./app.js";
import { connectBrowser, launchBrowser } from "./utils/browser.js";
import { createLogger } from "./utils/logger.js";
import { randomChoice } from "./utils/random.js";
import { loadSettings } from "./utils/settings.js";

const settings = await loadSettings(JSON.parse(await fs.readFile("./../../settings.json", "utf-8")));
const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });
const browser = await Promise.all(
	settings.profiles.map(async (profile) => {
		const browser = await match(profile.browser)
			.with({ type: "launch" }, (e) => {
				return launchBrowser({
					browserType: e.browserType,
					userDataDir: e.userDataDir,
					headless: e.headless,
					executablePath: e.executablePath,
					env: e.env,
					proxy: e.proxy,
					args: e.args,
					viewport: e.viewport,
				});
			})
			.with({ type: "cdp" }, (e) => {
				return connectBrowser({
					browserType: e.browserType,
					cdpEndpoint: e.cdpEndpoint,
				});
			})
			.exhaustive();

		logger.info(`Browser for profile "${profile.name}" launched successfully`);
		const page = await browser.newPage();
		const client = createTwitterBrowser(page);
		await client.inject();
		await client.goto(profile.home.url);
		return client;
	}),
);

const app = await createApp(() => randomChoice(browser));

console.log(`Proxy server is running on http://localhost:${settings.port}`);
serve({ fetch: app.fetch, port: settings.port });
