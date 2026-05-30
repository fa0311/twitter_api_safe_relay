import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";

export type GraphQLRequest = {
	queryId: string;
	operationName: string;
	operationType: "query" | "mutation";
	metadata: {
		featureSwitches: string[];
		fieldToggles: string[];
	};
};
export type GraphQLOptions = {
	fieldToggles: Record<string, unknown>;
};

export type TwitterApiProfileClient = {
	graphQL: (param: GraphQLRequest, body: unknown, data: unknown, options: GraphQLOptions) => Promise<unknown>;
	graphQLFullResponse: (
		param: GraphQLRequest,
		body: unknown,
		data?: unknown,
		options?: GraphQLOptions,
	) => Promise<unknown>;
	dispatch: (request: unknown) => Promise<unknown>;
	inject: () => Promise<void>;
	debugStream: ReadableStream<unknown>;
	enableDebug: () => Promise<void>;
	waitStartup: () => Promise<void>;
	page: Page;
};

declare global {
	var elonmusk_114514_request: (payload: unknown) => Promise<unknown>;
	var elonmusk_114514_emit_debug: (entry: unknown) => Promise<void> | void;
	var elonmusk_114514_wait_startup: {
		promise: Promise<void>;
	};
}

const defaultInjectSetupScriptPath = fileURLToPath(new URL("../injects/setup.js", import.meta.url));

export const createTwitterClient = (page: Page): TwitterApiProfileClient => {
	const [debugStream, debugWriter] = (() => {
		const stream = new TransformStream<unknown, unknown>();
		return [stream.readable, stream.writable.getWriter()];
	})();

	const enableDebug = async () => {
		await page.exposeFunction("elonmusk_114514_emit_debug", (entry: unknown) => {
			debugWriter.write(entry);
		});
	};

	const inject = async () => {
		const injectSetupScript = await fs.readFile(defaultInjectSetupScriptPath, "utf-8");
		await page.addInitScript(injectSetupScript);
	};

	const graphQL = async (param: GraphQLRequest, body: unknown, data?: unknown, options?: GraphQLOptions) => {
		return await page.evaluate((request) => globalThis.elonmusk_114514_request(request), {
			property: "graphQL",
			query: [param, body, data, options],
		});
	};

	const graphQLFullResponse = async (
		param: GraphQLRequest,
		body: unknown,
		data?: unknown,
		options?: GraphQLOptions,
	) => {
		return await page.evaluate((request) => globalThis.elonmusk_114514_request(request), {
			property: "graphQLFullResponse",
			query: [param, body, data, options],
		});
	};

	const dispatch = async (query: unknown) => {
		return await page.evaluate((request) => globalThis.elonmusk_114514_request(request), {
			property: "dispatch",
			query: [query],
		});
	};

	const waitStartup = async () => await page.evaluate(() => globalThis.elonmusk_114514_wait_startup.promise);

	return { graphQL, graphQLFullResponse, dispatch, page, waitStartup, debugStream, enableDebug, inject };
};
