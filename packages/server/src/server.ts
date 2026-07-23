#!/usr/bin/env node

import { Hono } from "hono";
import createApp from "./app.ts";
import { startRelay } from "./start.ts";

await startRelay({
	createApp: async (clients) => {
		const app = new Hono();
		app.route("/", await createApp(clients));
		return app;
	},
});
