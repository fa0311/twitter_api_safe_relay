import { Hono } from "hono";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";

const createApp = async (getClient: () => TwitterApiProfileClient) => {
	const app = new Hono();

	app.get("/i/api/graphql/:queryId/:operationName", async (c) => {
		const client = getClient();
		const queryId = c.req.param("queryId");
		const operationName = c.req.param("operationName");

		const result = await client.dispatch({
			headers: {
				"content-type": "application/json",
			},
			method: "GET",
			params: c.req.query(),
			path: `/graphql/${queryId}/${operationName}`,
		});
		return c.json(result);
	});

	app.post("/i/api/graphql/:queryId/:operationName", async (c) => {
		const client = getClient();
		const queryId = c.req.param("queryId");
		const operationName = c.req.param("operationName");

		const result = await client.dispatch({
			headers: {
				"content-type": "application/json",
			},
			method: "POST",
			data: await c.req.json(),
			params: c.req.query(),
			path: `/graphql/${queryId}/${operationName}`,
		});
		return c.json(result);
	});

	app.get("/1.1/*", async (c) => {
		const client = getClient();
		const path = c.req.path;
		const result = await client.dispatch({
			method: "GET",
			params: c.req.query(),
			path: path,
		});
		return c.json(result);
	});

	app.post("/1.1/*", async (c) => {
		const client = getClient();
		const path = c.req.path;
		const result = await client.dispatch({
			method: "POST",
			data: await c.req.json(),
			params: c.req.query(),
			path: path,
		});
		return c.json(result);
	});

	app.get("/2/*", async (c) => {
		const client = getClient();
		const path = c.req.path;
		const result = await client.dispatch({
			method: "GET",
			params: c.req.query(),
			path: path,
		});
		return c.json(result);
	});

	app.post("/2/*", async (c) => {
		const client = getClient();
		const path = c.req.path;
		const result = await client.dispatch({
			method: "POST",
			data: await c.req.json(),
			params: c.req.query(),
			path: path,
		});
		return c.json(result);
	});

	return app;
};
export default createApp;
