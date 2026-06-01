import type { Context } from "hono";
import { Hono } from "hono";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import type { AppOptions } from "./utils/app.js";
import { randomChoice } from "./utils/random.js";

const createApp = async (options: AppOptions[]) => {
	const app = new Hono();

	app.get("/health", (c) => {
		return c.json({ status: "ok", profiles: options.map((o) => o.name) });
	});

	app.get("/profiles", (c) => {
		return c.json({ profiles: options.map((o) => o.name) });
	});

	// Middleware: resolve client for all API routes
	const withClient = (c: Context, handler: (client: TwitterApiProfileClient) => Promise<Response>) => {
		const profileName = c.req.header("x-profile-name");
		const profileNames = options.map((o) => o.name);

		if (profileName === undefined) {
			return handler(randomChoice(options).client);
		}

		const filteredOptions = options.filter((o) => o.name === profileName);

		if (filteredOptions.length > 0) {
			return handler(randomChoice(filteredOptions).client);
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

	app.get("/1.1/*", (c) => {
		return withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "GET",
				params: c.req.query(),
				path: c.req.path,
			});
			return c.json(result);
		});
	});

	app.post("/1.1/*", (c) => {
		return withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "POST",
				data: await c.req.json(),
				params: c.req.query(),
				path: c.req.path,
			});
			return c.json(result);
		});
	});

	app.get("/2/*", (c) => {
		return withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "GET",
				params: c.req.query(),
				path: c.req.path,
			});
			return c.json(result);
		});
	});

	app.post("/2/*", (c) => {
		return withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "POST",
				data: await c.req.json(),
				params: c.req.query(),
				path: c.req.path,
			});
			return c.json(result);
		});
	});

	return app;
};
export default createApp;
