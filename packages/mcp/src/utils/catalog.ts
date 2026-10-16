import { readCatalog } from "twitter-api-safe-relay";
import { z } from "zod";

const GraphqlPath = new URLPattern({ pathname: "/graphql/:queryId/:operationName" });

const GraphqlPathSchema = z.string().transform((path, ctx) => {
	const match = GraphqlPath.exec(path);
	if (match === null) {
		ctx.addIssue({ code: "custom", message: `Path must match /graphql/:queryId/:operationName, got ${path}` });
		return z.NEVER;
	}
	const { queryId, operationName } = match.pathname.groups;
	if (queryId === undefined || operationName === undefined) {
		ctx.addIssue({ code: "custom", message: `Path must match /graphql/:queryId/:operationName, got ${path}` });
		return z.NEVER;
	}
	return { queryId, operationName };
});

const GraphqlGetSchema = z
	.strictObject({
		method: z.literal("GET"),
		path: GraphqlPathSchema,
		headers: z.record(z.string(), z.string()),
		params: z.strictObject({
			variables: z.string(),
			features: z.string().optional(),
			fieldToggles: z.string().optional(),
		}),
	})
	.transform((capture) => ({ type: "graphql" as const, ...capture }));

const GraphqlPostSchema = z
	.strictObject({
		method: z.literal("POST"),
		path: GraphqlPathSchema,
		headers: z.record(z.string(), z.string()),
		data: z.strictObject({
			queryId: z.string(),
			variables: z.record(z.string(), z.json()),
			features: z.record(z.string(), z.json()).optional(),
			fieldToggles: z.record(z.string(), z.json()).optional(),
		}),
	})
	.transform((capture) => ({ type: "graphql" as const, ...capture }));

const RestGetSchema = z
	.strictObject({
		method: z.literal("GET"),
		path: z.string(),
		headers: z.record(z.string(), z.string()).optional(),
		params: z.record(z.string(), z.json()).optional(),
	})
	.transform((capture) => ({ type: "rest" as const, ...capture }));

const RestPostSchema = z
	.strictObject({
		method: z.literal("POST"),
		path: z.string(),
		headers: z.record(z.string(), z.string()).optional(),
		params: z.record(z.string(), z.json()).optional(),
		data: z.record(z.string(), z.json()),
	})
	.transform((capture) => ({ type: "rest" as const, ...capture }));

const CaptureSchema = z.union([GraphqlGetSchema, GraphqlPostSchema, RestGetSchema, RestPostSchema]);

export type Capture = z.output<typeof CaptureSchema>;

// The catalog bundled with twitter-api-safe-relay (requests.ndjson), or one served by a URL.
export const fetchCapture = async (url?: string) => {
	const lines = await (async () => {
		if (url === undefined) {
			return readCatalog();
		}
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch request catalog from ${url}: ${response.status} ${response.statusText}`);
		}
		return (await response.text()).split("\n").filter((line) => line.trim() !== "");
	})();
	return lines.map((line) => CaptureSchema.parse(JSON.parse(line)));
};
