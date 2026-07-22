import fs from "node:fs/promises";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import createApp from "../app.js";
import { createLogger } from "../utils/logger.js";
import { createProfileClients } from "../utils/profiles.js";
import { loadSettings } from "../utils/settings.js";
import { registerGracefulShutdown } from "../utils/shutdown.js";
import { createDebugApp } from "./app.js";

const settings = await loadSettings(JSON.parse(await fs.readFile("./../../settings.json", "utf-8")));
const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });

const profileClients = await createProfileClients(settings.profiles, (profile) => {
	logger.info(`Browser for profile "${profile.name}" launched successfully`);
});
const clients = profileClients.map(({ profile, client }) => ({ name: profile.name, client }));

const relayApi = await createApp(clients);
const app = new Hono();

const debugApi = createDebugApp(clients);
app.route("/", debugApi);
app.route("/", relayApi);
app.use("/*", serveStatic({ root: "../dashboard/dist" }));

console.log(`Debug server is running on http://localhost:${settings.port}`);
const server = serve({ fetch: app.fetch, port: settings.port });
registerGracefulShutdown(
	server,
	clients.map(({ client }) => client),
);
