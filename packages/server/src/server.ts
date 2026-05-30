import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import { createTwitterClient } from "twitter-api-safe-request";
import createApp from "./app.js";
import { createBrowser } from "./utils/browser.js";
import { createLogger } from "./utils/logger.js";
import { randomChoice } from "./utils/random.js";
import { loadSettings } from "./utils/settings.js";

const settings = await loadSettings(JSON.parse(await fs.readFile("./../../settings.json", "utf-8")));
const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });
const browser = await Promise.all(
	settings.profiles.map(async (profile) => {
		const browser = await createBrowser({
			browserType: profile.browserType,
			userDataDir: profile.browser.userDataDir,
			headless: profile.browser.headless,
			executablePath: profile.browser.executablePath,
			env: profile.browser.env,
			proxy: profile.browser.proxy,
			args: profile.browser.args,
			viewport: profile.browser.viewport,
		});
		logger.info(`Browser for profile "${profile.name}" launched successfully`);
		const page = await browser.newPage();
		const client = createTwitterClient(page);
		await client.inject();
		await page.goto(profile.home.url);
		await client.waitStartup();
		return client;
	}),
);

const app = await createApp(() => randomChoice(browser));

console.log(`Proxy server is running on http://localhost:${settings.port}`);
serve({ fetch: app.fetch, port: settings.port });
