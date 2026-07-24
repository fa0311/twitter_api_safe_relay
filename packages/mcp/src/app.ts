import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { z } from "zod";
import { randomChoice } from "./utils/random.ts";

type AppOptions = {
	name: string;
	client: TwitterApiProfileClient;
};

const createMcpServer = (options: AppOptions[]) => {
	const server = new McpServer({ name: "twitter-api-safe-mcp", version: "0.0.4" });

	const resolveClient = (profileName?: string) => {
		if (profileName === undefined) {
			return randomChoice(options).client;
		}

		const filteredOptions = options.filter((o) => o.name === profileName);

		if (filteredOptions.length === 0) {
			const profileNames = options.map((o) => o.name);
			throw new Error(`Unknown profile: "${profileName}". Available: ${profileNames.join(", ")}`);
		}

		return randomChoice(filteredOptions).client;
	};

	server.registerTool(
		"list_profiles",
		{
			description: "List the browser profile names available for Twitter/X API requests.",
			inputSchema: {},
		},
		async () => {
			return { content: [{ type: "text", text: JSON.stringify({ profiles: options.map((o) => o.name) }) }] };
		},
	);

	server.registerTool(
		"twitter_api_request",
		{
			description: [
				"Send a Twitter/X web API request through a logged-in browser profile.",
				'The path is relative to https://x.com/i/api, e.g. "/graphql/<queryId>/<operationName>",',
				'"/1.1/friends/following/list.json" or "/2/notifications/all.json".',
				'GraphQL requests take JSON "variables" and "features" query parameters;',
				"non-string parameter values are JSON-encoded automatically.",
			].join(" "),
			inputSchema: {
				method: z.enum(["GET", "POST"]).default("GET").describe("HTTP method"),
				path: z.string().describe("API path relative to https://x.com/i/api"),
				params: z
					.record(z.string(), z.unknown())
					.optional()
					.describe("Query parameters; non-string values are JSON-encoded"),
				body: z.unknown().optional().describe("JSON request body (POST only)"),
				profile: z.string().optional().describe("Browser profile name; a random profile is used when omitted"),
			},
		},
		async ({ method, path, params, body, profile }) => {
			try {
				const client = resolveClient(profile);
				const query = Object.fromEntries(
					Object.entries(params ?? {}).map(([key, value]) => [
						key,
						typeof value === "string" ? value : JSON.stringify(value),
					]),
				);
				const result = await client.dispatch({
					headers: path.startsWith("/graphql") ? { "content-type": "application/json" } : undefined,
					method,
					data: method === "POST" ? body : undefined,
					params: query,
					path,
				});
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error) {
				const message = error instanceof Error ? error.message : JSON.stringify(error);
				return { content: [{ type: "text", text: message }], isError: true };
			}
		},
	);

	return server;
};

export default createMcpServer;
