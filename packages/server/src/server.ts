#!/usr/bin/env node

import { once } from "node:events";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { assetsRoot } from "twitter-api-safe-relay-dashboard";
import { createApp } from "./app.ts";
import { createDashboardApp } from "./index.ts";

import { createFatalLogger, createLogger } from "./tools.ts";
import { createCleanup } from "./utils/cleanup.ts";
import { createDefaultSettings, loadCliSettings } from "./utils/cli.ts";
import { createProfileClients } from "./utils/profiles.ts";
import { parseSettings } from "./utils/settings.ts";
import { createShutdown } from "./utils/shutdown.ts";

const cleanup = createCleanup({ reuse: false });
const shutdown = createShutdown();
const fatalLogger = createFatalLogger();

process.once("SIGTERM", () => {
	shutdown.close();
});
process.once("SIGINT", () => {
	shutdown.close();
});

try {
	const [file] = process.argv.slice(2);

	const settings = await (async () => {
		if (file) {
			const data = await loadCliSettings(file);
			return parseSettings(data);
		} else if (process.stdin.isTTY) {
			const data = await createDefaultSettings();
			return parseSettings(data);
		} else {
			throw new Error("No settings file specified. Usage: twitter-api-safe-relay <settings-file>");
		}
	})();

	const logger = createLogger(settings.logger);
	fatalLogger.set((message) => logger.error(message));

	const clients = await Promise.all(
		settings.profiles.map(async (profile) => {
			const { close, emitter, initialize } = await createProfileClients();
			await cleanup.add(close);
			emitter.on("error", ({ profileName, error }) => {
				logger.error(`Error occurred for profile "${profileName}": ${error}`);
				shutdown.error(error);
			});
			emitter.on("close", ({ profileName }) => {
				logger.info(`Browser closed for profile "${profileName}"`);
			});
			emitter.on("reload", ({ profileName }) => {
				logger.info(`Page reloaded for profile "${profileName}"`);
			});
			emitter.on("crash", ({ profileName }) => {
				logger.error(`Page crashed for profile "${profileName}"`);
			});
			emitter.on("pageerror", ({ profileName, error }) => {
				logger.error(`Page error occurred for profile "${profileName}": ${error}`);
			});

			const getClient = await initialize(profile);
			logger.info(`Profile "${profile.name}" initialized`);

			return { name: profile.name, getClient };
		}),
	);

	logger.info(`Available profiles: ${settings.profiles.map((profile) => profile.name).join(", ")}`);

	const app = new Hono();
	app.route("/", await createApp(clients));
	if (settings.dashboard) {
		app.route("/", createDashboardApp(clients));
		app.use("/*", serveStatic({ root: assetsRoot }));
	}

	const server = serve({ fetch: app.fetch, hostname: settings.hostname, port: settings.port });

	await once(server, "listening");
	logger.info(`Server is running on http://${settings.hostname}:${settings.port}`);

	await cleanup.add(() => {
		return new Promise<void>((resolve, reject) => {
			server.close((error) => (error ? reject(error) : resolve()));
		});
	});

	server.on("error", (error) => {
		shutdown.error(error);
	});
	server.on("close", () => {
		shutdown.close();
	});

	await shutdown.wait();
} catch (error) {
	fatalLogger.fatal(error);
} finally {
	try {
		await cleanup.close();
	} catch (error) {
		fatalLogger.fatal(error);
	}
}
