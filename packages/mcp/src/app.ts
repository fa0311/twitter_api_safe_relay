import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { randomChoice } from "twitter-api-safe-relay/tools";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { z } from "zod";
import packageJson from "../package.json" with { type: "json" };
import type { Capture } from "./utils/catalog.ts";

type AppOptions = {
	name: string;
	client: TwitterApiProfileClient;
};

const VariablesSchema = z.record(z.string(), z.json());

const createMcpServer = (options: AppOptions[], catalog: Capture[]) => {
	const server = new McpServer({ name: packageJson.name, version: packageJson.version });
	const graphql = catalog.filter((capture) => capture.type === "graphql");

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

	const resolveOperation = (name: string) => {
		const operation = graphql.find((capture) => capture.path.operationName === name);

		if (operation === undefined) {
			throw new Error(`Unknown GraphQL operation: "${name}". Use list_endpoints.`);
		}

		return operation;
	};

	server.registerTool(
		"list_profiles",
		{
			description: "List available browser profile names.",
			inputSchema: {},
		},
		() => ({ content: [{ type: "text", text: options.map((o) => o.name).join("\n") }] }),
	);

	server.registerTool(
		"list_endpoints",
		{
			description: 'GraphQL operations by name, and everything else as "METHOD path".',
			inputSchema: {},
		},
		() => {
			const lines = [
				...new Set(
					catalog.map((capture) =>
						capture.type === "graphql" ? capture.path.operationName : `${capture.method} ${capture.path}`,
					),
				),
			];
			return { content: [{ type: "text", text: lines.join("\n") }] };
		},
	);

	server.registerTool(
		"get_endpoint",
		{
			description:
				"Recorded request for a non-GraphQL path, as a template for twitter_api_request. Replace example values.",
			inputSchema: { path: z.string().describe('Exact path from list_endpoints, e.g. "/1.1/search/typeahead.json"') },
		},
		({ path }) => {
			const matches = catalog.filter((capture) => capture.type === "rest" && capture.path === path);
			return { content: [{ type: "text", text: JSON.stringify(matches) }] };
		},
	);

	server.registerTool(
		"get_operation",
		{
			description:
				"Example variables for a GraphQL operation. Variable keys differ per operation; never reuse keys across operations.",
			inputSchema: { operation: z.string().describe('Operation name, e.g. "TweetDetail"') },
		},
		({ operation }) => {
			const capture = resolveOperation(operation);
			const data = (() => {
				switch (capture.method) {
					case "GET":
						return { method: capture.method, variables: VariablesSchema.parse(JSON.parse(capture.params.variables)) };
					case "POST":
						return { method: capture.method, variables: capture.data.variables };
				}
			})();
			return { content: [{ type: "text", text: JSON.stringify(data) }] };
		},
	);

	server.registerTool(
		"twitter_api_graphql",
		{
			description:
				"Send a GraphQL request by operation name. queryId, features and fieldToggles come from the catalog; variables must be given in full.",
			inputSchema: {
				operation: z.string().describe('Operation name, e.g. "TweetDetail"'),
				variables: z.record(z.string(), z.json()).describe("Every key from get_operation, with values filled in"),
				profile: z.string().optional().describe("Random when omitted"),
			},
		},
		async ({ operation, variables, profile }) => {
			const capture = resolveOperation(operation);
			const { queryId, operationName } = capture.path;

			const result = (() => {
				switch (capture.method) {
					case "GET":
						return {
							params: {
								variables: JSON.stringify(variables),
								features: capture.params.features,
								fieldToggles: capture.params.fieldToggles,
							},
						};
					case "POST":
						return {
							data: {
								queryId: capture.data.queryId,
								variables: variables,
								features: capture.data.features,
								fieldToggles: capture.data.fieldToggles,
							},
						};
				}
			})();

			const data = await resolveClient(profile).dispatch({
				headers: capture.headers,
				method: capture.method,
				path: `/graphql/${queryId}/${operationName}`,
				...result,
			});
			return { content: [{ type: "text", text: JSON.stringify(data) }] };
		},
	);

	server.registerTool(
		"twitter_api_request",
		{
			description: "Send a request to the Twitter API. Prefer twitter_api_graphql for GraphQL.",
			inputSchema: {
				method: z.enum(["GET", "POST"]).default("GET"),
				path: z.string().describe("Relative to https://x.com/i/api"),
				params: z.record(z.string(), z.json()).default({}).describe("Query parameters"),
				body: z.json().optional().describe("POST only"),
				headers: z
					.record(z.string(), z.string())
					.default({})
					.describe('Set {"content-type":"application/json"} to send a JSON body'),
				profile: z.string().optional().describe("Random when omitted"),
			},
		},
		async ({ method, path, params, body, headers, profile }) => {
			const result = await resolveClient(profile).dispatch({ headers, method, data: body, params, path });
			return { content: [{ type: "text", text: JSON.stringify(result) }] };
		},
	);

	return server;
};

export default createMcpServer;
