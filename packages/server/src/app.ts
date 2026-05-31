import type { Context } from "hono";
import { Hono } from "hono";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";

interface AppOptions {
	getClient: (profileName?: string) => TwitterApiProfileClient | null;
	profileNames: string[];
}

const resolveClient = (c: Context, getClient: AppOptions["getClient"]) => {
	const profileName = c.req.query("profile");
	if (profileName !== undefined && profileName === "") {
		return null;
	}
	const client = getClient(profileName || undefined);
	if (!client) {
		return null;
	}
	return client;
};

const forwardParams = (c: Context) => {
	const params = { ...c.req.query() };
	delete params.profile;
	return params;
};

const createApp = async ({ getClient, profileNames }: AppOptions) => {
	const app = new Hono();

	app.get("/profiles", (c) => {
		return c.json({ profiles: profileNames });
	});

	// Middleware: resolve client for all API routes
	const withClient = (c: Context, handler: (client: TwitterApiProfileClient) => Promise<Response>) => {
		const client = resolveClient(c, getClient);
		if (!client) {
			return c.json({ error: `Unknown profile: "${c.req.query("profile")}"`, available: profileNames }, 400);
		}
		return handler(client);
	};

	app.get("/i/api/graphql/:queryId/:operationName", (c) =>
		withClient(c, async (client) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			const result = await client.dispatch({
				headers: { "content-type": "application/json" },
				method: "GET",
				params: forwardParams(c),
				path: `/graphql/${queryId}/${operationName}`,
			});
			return c.json(result);
		}),
	);

	app.post("/i/api/graphql/:queryId/:operationName", (c) =>
		withClient(c, async (client) => {
			const queryId = c.req.param("queryId");
			const operationName = c.req.param("operationName");
			const result = await client.dispatch({
				headers: { "content-type": "application/json" },
				method: "POST",
				data: await c.req.json(),
				params: forwardParams(c),
				path: `/graphql/${queryId}/${operationName}`,
			});
			return c.json(result);
		}),
	);

	app.get("/1.1/*", (c) =>
		withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "GET",
				params: forwardParams(c),
				path: c.req.path,
			});
			return c.json(result);
		}),
	);

	app.post("/1.1/*", (c) =>
		withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "POST",
				data: await c.req.json(),
				params: forwardParams(c),
				path: c.req.path,
			});
			return c.json(result);
		}),
	);

	app.get("/2/*", (c) =>
		withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "GET",
				params: forwardParams(c),
				path: c.req.path,
			});
			return c.json(result);
		}),
	);

	app.post("/2/*", (c) =>
		withClient(c, async (client) => {
			const result = await client.dispatch({
				method: "POST",
				data: await c.req.json(),
				params: forwardParams(c),
				path: c.req.path,
			});
			return c.json(result);
		}),
	);

	return app;
};
export default createApp;
