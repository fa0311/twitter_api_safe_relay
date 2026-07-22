import { serve } from "@hono/node-server";
import type { Hono } from "hono";
import type { AppOptions } from "./utils/app.ts";
import { loadCliSettings } from "./utils/cli.ts";
import { createLogger } from "./utils/logger.ts";
import { createProfileClients } from "./utils/profiles.ts";

export type StartRelayOptions = {
	createApp: (clients: AppOptions[]) => Promise<Hono>;
};

export const startRelay = async (options: StartRelayOptions) => {
	const settings = await loadCliSettings();
	const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });

	const clients = await Promise.all(
		settings.profiles.map(async (profile) => {
			const { client, emitter, close } = await createProfileClients(profile);
			logger.info(`Browser for profile "${profile.name}" launched successfully`);
			emitter.on("reload", ({ profileName }) => {
				logger.info(`Page reloaded for profile "${profileName}"`);
			});
			emitter.on("crash", ({ profileName }) => {
				logger.error(`Page crashed for profile "${profileName}"`);
			});
			emitter.on("error", ({ profileName, error }) => {
				logger.error(`Error occurred for profile "${profileName}": ${error}`);
			});

			process.on("SIGTERM", () => close());
			process.on("SIGINT", () => close());

			return { name: profile.name, client };
		}),
	);

	const app = await options.createApp(clients);

	console.log(`Server is running on http://localhost:${settings.port}`);
	console.log(`Available profiles: ${settings.profiles.map((profile) => profile.name).join(", ")}`);

	const server = serve({ fetch: app.fetch, port: settings.port });
	process.on("SIGTERM", () => server.close());
	process.on("SIGINT", () => server.close());
};
