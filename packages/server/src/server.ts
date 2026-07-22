import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import createApp from "./app.js";
import { createLogger } from "./utils/logger.js";
import { createProfileClients } from "./utils/profiles.js";
import { loadSettings } from "./utils/settings.js";
import { registerGracefulShutdown } from "./utils/shutdown.js";

const settings = await loadSettings(JSON.parse(await fs.readFile("./../../settings.json", "utf-8")));
const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });
const profileClients = await createProfileClients(settings.profiles, (profile) => {
	logger.info(`Browser for profile "${profile.name}" launched successfully`);
});
const clients = profileClients.map(({ profile, client }) => {
	if (profile.pageReloadIntervalMinutes) {
		const call = async () => {
			logger.info(`Reloading page for profile "${profile.name}"`);
			await client.page.reload();
		};
		setInterval(call, profile.pageReloadIntervalMinutes * 60_000);
	}
	client.page.on("crash", async () => {
		logger.error(`Page for profile "${profile.name}" has crashed. Attempting to reload...`);
		await client.page.reload().catch((error) => {
			logger.error(`Failed to reload page for profile "${profile.name}" after crash: ${error.message}`);
		});
	});
	return { name: profile.name, client };
});

const app = await createApp(clients);

console.log(`Relay server is running on http://localhost:${settings.port}`);
console.log(`Available profiles: ${settings.profiles.map((p) => p.name).join(", ")}`);
const server = serve({ fetch: app.fetch, port: settings.port });
registerGracefulShutdown(
	server,
	clients.map(({ client }) => client),
);
