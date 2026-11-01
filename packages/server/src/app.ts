import fs from "node:fs/promises";
import type { Context } from "hono";
import { Hono } from "hono";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { catalogPath } from "./catalog.ts";
import type { AppOptions } from "./utils/app.ts";
import { randomChoice } from "./utils/random.ts";
import { createRateLimitStore, dispatchWithHeaders, rateLimitHeadersOf } from "./utils/ratelimit.ts";

export const createApp = async (options: AppOptions[]) => {
	const app = new Hono();
	const rateLimit = createRateLimitStore();

	app.get("/health", (c) => {
		return c.json({ status: "ok", profiles: options.map((o) => o.name), rateLimit: rateLimit.state });
	});

	app.get("/profiles", (c) => {
		return c.json({ profiles: options.map((o) => o.name) });
	});

	app.get("/requests.ndjson", async (c) => {
		return c.body(await fs.readFile(catalogPath, "utf-8"), 200, { "content-type": "application/x-ndjson" });
	});

	// Middleware: resolve client for all API routes
	const withClient = async (
		c: Context,
		handler: (client: TwitterApiProfileClient, name: string) => Promise<Response>,
	) => {
		const profileName = c.req.header("x-profile-name");
		const profileNames = options.map((o) => o.name);

		if (profileName === undefined) {
			const { name, getClient } = randomChoice(options);
			return handler(await getClient(), name);
		}

		const filteredOptions = options.filter((o) => o.name === profileName);

		if (filteredOptions.length > 0) {
			const { name, getClient } = randomChoice(filteredOptions);
			return handler(await getClient(), name);
		}

		return c.json({ error: `Unknown profile: "${profileName}"`, available: profileNames }, 400);
	};

	// The body is what X's client returned; X's rate-limit headers are passed through and remembered for /health
	const relay = async <T extends { path: string }>(
		c: Context,
		client: TwitterApiProfileClient,
		name: string,
		request: T,
	) => {
		const [result, headers] = await dispatchWithHeaders(client, request);
		rateLimit.update(name, request.path, headers);
		return c.json(result, 200, rateLimitHeadersOf(headers));
	};

	app.get("/i/api/graphql/:queryId/:operationName", (c) => {
		return withClient(c, async (client, name) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			return relay(c, client, name, {
				headers: { "content-type": "application/json" },
				method: "GET",
				params: c.req.query(),
				path: `/graphql/${queryId}/${operationName}`,
			});
		});
	});

	app.post("/i/api/graphql/:queryId/:operationName", (c) => {
		return withClient(c, async (client, name) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			return relay(c, client, name, {
				headers: { "content-type": "application/json" },
				method: "POST",
				data: await c.req.json(),
				params: c.req.query(),
				path: `/graphql/${queryId}/${operationName}`,
			});
		});
	});

	// v1.1 / v2 REST live under /i/api like GraphQL, as in the X web app; dispatch paths are relative to it
	const prefix = "/i/api";
	const rest = (method: "GET" | "POST") => (c: Context) => {
		return withClient(c, async (client, name) => {
			return relay(c, client, name, {
				method,
				...(method === "POST" ? { data: await c.req.json() } : {}),
				params: c.req.query(),
				path: c.req.path.slice(prefix.length),
			});
		});
	};

	app.get(`${prefix}/1.1/*`, rest("GET"));
	app.post(`${prefix}/1.1/*`, rest("POST"));
	app.get(`${prefix}/2/*`, rest("GET"));
	app.post(`${prefix}/2/*`, rest("POST"));

	return app;
};
