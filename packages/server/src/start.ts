import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { assetsRoot } from "twitter-api-safe-relay-dashboard";
import { createApp } from "./app.ts";
import { createDashboardApp } from "./dashboard/app.ts";
import type { AppOptions } from "./utils/app.ts";
import { createCleanup } from "./utils/cleanup.ts";
import { createLogger } from "./utils/logger.ts";
import { createProfileClients } from "./utils/profiles.ts";
import type { Settings } from "./utils/settings.ts";

export type OnReady = {
	clients: AppOptions[];
	close: () => Promise<void>;
};

export const startRelay = async (settings: Settings, onReady: (arg: OnReady) => Promise<void>) => {
	const cleanup = createCleanup();

	return {
		close: cleanup.close,
		run: async () => {
			const logger = createLogger(settings.logger);

			const clients = await Promise.all(
				settings.profiles.map(async (profile) => {
					const { close, emitter, initialize } = await createProfileClients(profile);
					await cleanup.add(close);
					emitter.on("close", async ({ profileName }) => {
						logger.info(`Browser closed for profile "${profileName}"`);
						await cleanup.close();
					});
					emitter.on("reload", ({ profileName }) => {
						logger.info(`Page reloaded for profile "${profileName}"`);
					});
					emitter.on("crash", ({ profileName }) => {
						logger.error(`Page crashed for profile "${profileName}"`);
					});
					emitter.on("error", ({ profileName, error }) => {
						logger.error(`Error occurred for profile "${profileName}": ${error}`);
					});

					const client = await initialize();
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
				server.on("listening", async () => {
					logger.info(`Server is running on http://localhost:${settings.port}`);
					logger.info(`Available profiles: ${settings.profiles.map((profile) => profile.name).join(", ")}`);
					resolve(undefined);
				});
				server.on("error", (error) => {
					reject(error);
				});
			});

			await onReady({
				clients: clients,
				close: async () => await cleanup.close(),
			});

			await new Promise((resolve, reject) => {
				server.on("error", (error) => {
					reject(error);
				});
				server.on("close", () => {
					resolve(undefined);
				});
			});
		},
	};
};
