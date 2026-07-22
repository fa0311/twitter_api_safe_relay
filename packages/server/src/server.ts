#!/usr/bin/env node

import { serve } from "@hono/node-server";
import createApp from "./app.js";
import { loadCliSettings } from "./utils/cli.js";
import { createLogger } from "./utils/logger.js";
import { createProfileClients } from "./utils/profiles.js";

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

const app = await createApp(clients);

console.log(`Relay server is running on http://localhost:${settings.port}`);
console.log(`Available profiles: ${settings.profiles.map((p) => p.name).join(", ")}`);

const server = serve({ fetch: app.fetch, port: settings.port });

process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
