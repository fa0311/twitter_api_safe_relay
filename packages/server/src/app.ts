import fs from "node:fs/promises";
import type { Context } from "hono";
import { Hono } from "hono";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { catalogPath } from "./catalog.ts";
import type { AppOptions } from "./utils/app.ts";
import { randomChoice } from "./utils/random.ts";

export const createApp = async (options: AppOptions[]) => {
	const app = new Hono();

	app.get("/health", (c) => {
		return c.json({ status: "ok", profiles: options.map((o) => o.name) });
	});

	app.get("/profiles", (c) => {
		return c.json({ profiles: options.map((o) => o.name) });
	});

	app.get("/requests.ndjson", async (c) => {
		return c.body(await fs.readFile(catalogPath, "utf-8"), 200, { "content-type": "application/x-ndjson" });
	});

	// Middleware: resolve client for all API routes
	const withClient = async (c: Context, handler: (client: TwitterApiProfileClient) => Promise<Response>) => {
		const profileName = c.req.header("x-profile-name");
		const profileNames = options.map((o) => o.name);

		if (profileName === undefined) {
			return handler(await randomChoice(options).getClient());
		}

		const filteredOptions = options.filter((o) => o.name === profileName);

		if (filteredOptions.length > 0) {
			return handler(await randomChoice(filteredOptions).getClient());
		}

		return c.json({ error: `Unknown profile: "${profileName}"`, available: profileNames }, 400);
	};

	app.get("/i/api/graphql/:queryId/:operationName", (c) => {
		return withClient(c, async (client) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			const result = await client.dispatch({
				headers: { "content-type": "application/json" },
				method: "GET",
				params: c.req.query(),
				path: `/graphql/${queryId}/${operationName}`,
			});
			return c.json(result);
		});
	});

	app.post("/i/api/graphql/:queryId/:operationName", (c) => {
		return withClient(c, async (client) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			const result = await client.dispatch({
				headers: { "content-type": "application/json" },
				method: "POST",
				data: await c.req.json(),
				params: c.req.query(),
				path: `/graphql/${queryId}/${operationName}`,
			});
			return c.json(result);
		});
	});

	// v1.1 / v2 REST: the X web app calls them under /i/api too, so both prefixes are accepted
	const rest = (method: "GET" | "POST") => (c: Context) => {
		return withClient(c, async (client) => {
			const result = await client.dispatch({
				method,
				...(method === "POST" ? { data: await c.req.json() } : {}),
				params: c.req.query(),
				path: c.req.path.replace(/^\/i\/api/, ""),
			});
			return c.json(result);
		});
	};

	for (const prefix of ["", "/i/api"]) {
		app.get(`${prefix}/1.1/*`, rest("GET"));
		app.post(`${prefix}/1.1/*`, rest("POST"));
		app.get(`${prefix}/2/*`, rest("GET"));
		app.post(`${prefix}/2/*`, rest("POST"));
	}

	return app;
};
