#!/usr/bin/env node

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { createApp, createDashboardApp, createProfileClients } from "twitter-api-safe-relay";
import {
	catchError,
	createCleanup,
	createDefaultSettings,
	createLogger,
	createShutdown,
	loadCliSettings,
} from "twitter-api-safe-relay/tools";
import { assetsRoot } from "twitter-api-safe-relay-dashboard";
import createMcpServer from "./app.ts";
import { parseSettings } from "./utils/settings.ts";

const cleanup = createCleanup();

process.once("SIGTERM", async () => {
	await cleanup.close();
});
process.once("SIGINT", async () => {
	await cleanup.close();
});
process.stdin.on("end", async () => {
	await cleanup.close();
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
			throw new Error("No settings file specified. Usage: twitter-api-safe-mcp <settings-file>");
		}
	})();

	const logger = createLogger(settings.logger);

	const shutdown = createShutdown();

	const clients = await Promise.all(
		settings.profiles.map(async (profile) => {
			const { close, emitter, initialize } = await createProfileClients();
			await cleanup.add(close);
			emitter.on("error", ({ profileName, error }) => {
				logger.error(`Error occurred for profile "${profileName}": ${error}`);
				shutdown.error(error);
			});
			emitter.on("close", async ({ profileName }) => {
				logger.info(`Browser closed for profile "${profileName}"`);
				shutdown.close();
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

			const client = await initialize(profile);
			logger.info(`Browser for profile "${profile.name}" launched successfully`);
			return { name: profile.name, client };
		}),
	);

	logger.info(`Available profiles: ${settings.profiles.map((profile) => profile.name).join(", ")}`);

	const app = new Hono();
	app.route("/", await createApp(clients));
	if (settings.dashboard) {
		app.route("/", createDashboardApp(clients));
		app.use("/*", serveStatic({ root: assetsRoot }));
	}

	const server = serve({ fetch: app.fetch, port: settings.port });
	await cleanup.add(async () => void server.close());

	await new Promise((resolve, reject) => {
		server.on("error", reject);
		server.on("listening", async () => {
			logger.info(`Server is running on http://localhost:${settings.port}`);
			server.removeListener("error", reject);
			resolve(undefined);
		});
	});

	server.on("error", (error) => {
		shutdown.error(error);
	});
	server.on("close", () => {
		shutdown.close();
	});

	const mcpServer = createMcpServer(clients);
	await cleanup.add(async () => await mcpServer.close());

	mcpServer.server.onclose = () => {
		logger.info("MCP connection closed");
		shutdown.close();
	};

	await mcpServer.connect(new StdioServerTransport());
	logger.info("MCP server connected over stdio");

	await shutdown.wait();
} catch (error) {
	console.error(catchError(error));
	process.exitCode = 1;
} finally {
	await cleanup.close();
}
