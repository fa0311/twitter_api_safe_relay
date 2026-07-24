#!/usr/bin/env node

import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { assetsRoot } from "twitter-api-safe-relay-dashboard";
import createApp from "./app.ts";
import { createDashboardApp } from "./dashboard/app.ts";
import { startRelay } from "./start.ts";

await startRelay({
	createApp: async (clients, settings) => {
		const app = new Hono();
		if (settings.dashboard) {
			app.route("/", createDashboardApp(clients));
		}
		app.route("/", await createApp(clients));
		if (settings.dashboard) {
			app.use("/*", serveStatic({ root: assetsRoot }));
		}
		return app;
	},
});
