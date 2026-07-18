import type {
	GraphQLOptions,
	GraphQLRequest,
	TwitterApiHook,
	TwitterApiHookEntry,
} from "twitter-api-safe-inject/types";
import type { ContentScriptContext } from "wxt/utils/content-script-context";
import { injectScript, type ScriptPublicPath } from "wxt/utils/inject-script";
import type { Command } from "./command.js";
import { createHandler } from "./protocol.js";

export type {
	GraphQLOptions,
	GraphQLRequest,
	TwitterApiHook,
	TwitterApiHookEntry,
} from "twitter-api-safe-inject/types";

export const TWITTER_MATCHES = [
	"https://x.com/*",
	"https://*.x.com/*",
	"https://twitter.com/*",
	"https://*.twitter.com/*",
] as const;

export type TwitterApi = {
	waitStartup: () => Promise<void>;
	dispatch: (request: unknown) => Promise<unknown>;
	graphQL: (operation: GraphQLRequest, body: unknown, data?: unknown, options?: GraphQLOptions) => Promise<unknown>;
	graphQLFullResponse: (
		operation: GraphQLRequest,
		body: unknown,
		data?: unknown,
		options?: GraphQLOptions,
	) => Promise<unknown>;
	addHook: (name: string, hook: TwitterApiHook, options?: { priority?: number }) => Promise<void>;
	removeHook: (name: string) => Promise<void>;
};

const SETUP_SCRIPT = "/twitter-api-safe/setup.js" as ScriptPublicPath;
const BRIDGE_SCRIPT = "/twitter-api-safe/bridge.js" as ScriptPublicPath;

export const injectTwitterApi = async (ctx: ContentScriptContext): Promise<TwitterApi> => {
	await injectScript(SETUP_SCRIPT);
	const { script } = await injectScript(BRIDGE_SCRIPT, { keepInDom: true });
	const handler = createHandler<Command>(script);
	const hooks = new Map<string, TwitterApiHook>();

	const waitStartup = handler.request("waitStartup");
	const request = handler.request("request");
	const addHook = handler.request("addHook");
	const removeHook = handler.request("removeHook");
	const runHook = handler.response("runHook", async (name: string, entry: TwitterApiHookEntry) => {
		return (await hooks.get(name)?.(entry)) ?? entry;
	});

	ctx.onInvalidated(() => {
		waitStartup.dispose();
		request.dispose();
		addHook.dispose();
		removeHook.dispose();
		runHook.dispose();
		script.remove();
	});

	return {
		waitStartup: async () => await waitStartup.request(),
		dispatch: async (query) => await request.request({ property: "dispatch", query: [query] }),
		graphQL: async (operation, body, data, options) =>
			await request.request({ property: "graphQL", query: [operation, body, data, options] }),
		graphQLFullResponse: async (operation, body, data, options) =>
			await request.request({ property: "graphQLFullResponse", query: [operation, body, data, options] }),
		addHook: async (name, hook, options = {}) => {
			hooks.set(name, hook);
			await addHook.request(name, options.priority ?? 0);
		},
		removeHook: async (name) => {
			hooks.delete(name);
			await removeHook.request(name);
		},
	};
};
