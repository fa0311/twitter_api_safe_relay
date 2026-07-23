#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createApp, createDashboardApp, startRelay } from "twitter-api-safe-relay";

const dashboardRoot = fileURLToPath(new URL("../dist/", import.meta.url));

await startRelay({
	createApp: async (clients) => {
		const app = new Hono();
		app.route("/", createDashboardApp(clients));
		app.route("/", await createApp(clients));
		app.use("/*", serveStatic({ root: dashboardRoot }));
		return app;
	},
});
