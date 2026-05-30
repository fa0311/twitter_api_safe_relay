import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { injectTwitterClient } from "twitter-api-safe-request";
import createApp from "../app.js";
import { createBrowser } from "../utils/browser.js";
import { createLogger } from "../utils/logger.js";
import { randomChoice } from "../utils/random.js";
import { loadSettings } from "../utils/settings.js";
import { createDebugApp } from "./app.js";

const debugPort = 3001;

const settings = await loadSettings(JSON.parse(await fs.readFile("./../../settings.json", "utf-8")));
const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });

const { app: debugApi, emit } = createDebugApp();
const clients = await Promise.all(
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
		const client = await injectTwitterClient(page);
		await page.goto(profile.home.url);
		await client.enableDebug();
		void client.debugStream.pipeTo(new WritableStream({ write: emit }));
		return client;
	}),
);

const proxyApi = await createApp(() => randomChoice(clients));
const app = new Hono();

app.route("/", debugApi);
app.route("/", proxyApi);
app.use("/*", serveStatic({ root: "../dashboard/dist" }));


console.log(`Debug server is running on http://localhost:${debugPort}`);
serve({ fetch: app.fetch, port: debugPort });
