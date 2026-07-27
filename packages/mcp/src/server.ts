#!/usr/bin/env node

import { once } from "node:events";
import { StreamableHTTPTransport } from "@hono/mcp";
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
import { fetchCapture } from "./utils/catalog.ts";
import { parseSettings } from "./utils/settings.ts";

const cleanup = createCleanup();
const shutdown = createShutdown();

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
			throw new Error("No settings file specified. Usage: twitter-api-safe-mcp <settings-file>");
		}
	})();

	const logger = createLogger(settings.logger);

	if (settings.mcp.transport === "stdio") {
		process.stdin.once("end", () => {
			shutdown.close();
		});
	}

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
				shutdown.error(new Error(`Browser unexpectedly closed for profile "${profileName}"`));
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

	const catalog = await fetchCapture();
	logger.info(`Loaded ${catalog.length} recorded endpoints`);

	const mountDashboard = async (app: Hono) => {
		app.route("/", await createApp(clients));
		app.route("/", createDashboardApp(clients));
		app.use("/*", serveStatic({ root: assetsRoot }));
	};

	const listen = async (app: Hono) => {
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
	};

	switch (settings.mcp.transport) {
		case "http": {
			const app = new Hono();
			app.all("/mcp", async (c) => {
				const mcpServer = createMcpServer(clients, catalog);
				const transport = new StreamableHTTPTransport();
				await mcpServer.connect(transport);
				return transport.handleRequest(c);
			});
			if (settings.dashboard) {
				await mountDashboard(app);
			}
			await listen(app);
			logger.info(`MCP endpoint: http://${settings.hostname}:${settings.port}/mcp`);
			break;
		}
		case "stdio": {
			if (settings.dashboard) {
				const app = new Hono();
				await mountDashboard(app);
				await listen(app);
			}
			const mcpServer = createMcpServer(clients, catalog);
			await cleanup.add(async () => await mcpServer.close());

			mcpServer.server.onclose = () => {
				logger.info("MCP connection closed");
				shutdown.close();
			};

			await mcpServer.connect(new StdioServerTransport());
			logger.info("MCP server connected over stdio");
			break;
		}
	}

	await shutdown.wait();
} catch (error) {
	console.error(catchError(error));
	process.exitCode = 1;
} finally {
	try {
		await cleanup.close();
	} catch (error) {
		console.error(catchError(error));
		process.exitCode = 1;
	}
}
