import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Page } from "playwright";
import type {
	GraphQLOptions,
	GraphQLRequest,
	TwitterApiHook,
	TwitterApiHookEntry,
	TwitterApiRequest,
} from "twitter-api-safe-inject/types";

export type {
	GraphQLOptions,
	GraphQLRequest,
	TwitterApiHook,
	TwitterApiHookEntry,
} from "twitter-api-safe-inject/types";

export type TwitterApiHookManager = ReturnType<typeof createHookManager>;

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
	initHook: (runHooks: TwitterApiHookManager["runHooks"]) => Promise<void>;
	waitStartup: () => Promise<void>;
	goto: (url: string) => Promise<void>;
	page: Page;
};

const defaultInjectSetupScriptPath = fileURLToPath(import.meta.resolve("twitter-api-safe-inject/setup.js"));
declare global {
	var elonmusk_114514_run_hooks: TwitterApiHookManager["runHooks"];
}

const installHookBridge = () => {
	globalThis.elonmusk_114514_hook = async (entry) => await globalThis.elonmusk_114514_run_hooks(entry);
};

export const createHookManager = () => {
	let hooks: { hook: TwitterApiHook; priority: number; id: string }[] = [];

	const runHooks = async (entry: TwitterApiHookEntry) => {
		let data = entry;
		for (const { hook } of hooks) {
			data = (await hook(data)) ?? data;
		}
		return data;
	};

	const addHook = (id: string, hook: TwitterApiHook, options: { priority?: number } = {}) => {
		hooks = hooks.filter((h) => h.id !== id);
		hooks.push({ id, hook, priority: options.priority ?? 0 });
		hooks = hooks.toSorted((a, b) => b.priority - a.priority);
	};

	const removeHook = (id: string) => {
		hooks = hooks.filter((h) => h.id !== id);
	};

	return { runHooks, addHook, removeHook };
};

export const createTwitterBrowser = (page: Page): TwitterApiProfileClient => {
	const initHook = async (runHooks: (entry: TwitterApiHookEntry) => Promise<TwitterApiHookEntry>) => {
		await page.exposeFunction("elonmusk_114514_run_hooks", runHooks);
		await page.addInitScript(installHookBridge);
		await page.evaluate(installHookBridge);
	};

	const inject = async () => {
		const injectSetupScript = await fs.readFile(defaultInjectSetupScriptPath, "utf-8");
		await page.addInitScript(injectSetupScript);
	};

	const graphQL = async (param: GraphQLRequest, body: unknown, data?: unknown, options?: GraphQLOptions) => {
		return await page.evaluate((request) => globalThis.elonmusk_114514_request(request), {
			property: "graphQL",
			query: [param, body, data, options],
		} satisfies TwitterApiRequest);
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
		} satisfies TwitterApiRequest);
	};

	const dispatch = async (query: unknown) => {
		return await page.evaluate((request) => globalThis.elonmusk_114514_request(request), {
			property: "dispatch",
			query: [query],
		} satisfies TwitterApiRequest);
	};

	const waitStartup = async () => await page.evaluate(() => globalThis.elonmusk_114514_wait_startup.promise);

	const goto = async (url: string) => {
		await page.goto(url);
		await waitStartup();
	};

	return {
		graphQL,
		graphQLFullResponse,
		dispatch,
		page,
		waitStartup,
		initHook,
		inject,
		goto,
	};
};
