import type { TwitterApiHook, TwitterApiHookEntry } from "twitter-api-safe-inject/types";
import type { UnlistedScriptDefinition } from "wxt";
import { defineUnlistedScript } from "wxt/utils/define-unlisted-script";
import type { Command } from "../command.js";
import { createHandler } from "../protocol.js";

type RegisteredHook = {
	name: string;
	priority: number;
	hook: TwitterApiHook;
};

declare global {
	var elonmusk_114514_wxt_hooks: RegisteredHook[] | undefined;
}

const bridge: UnlistedScriptDefinition = defineUnlistedScript(() => {
	const target = document.currentScript as HTMLScriptElement;

	if (!globalThis.elonmusk_114514_wxt_hooks) {
		globalThis.elonmusk_114514_wxt_hooks = [];
		globalThis.elonmusk_114514_hook = async (entry) => {
			let data = entry;
			for (const hook of globalThis.elonmusk_114514_wxt_hooks ?? []) {
				data = (await hook.hook(data)) ?? data;
			}
			return data;
		};
	}

	const handler = createHandler<Command>(target);
	const runHook = handler.request("runHook");

	handler.response("waitStartup", async () => {
		await globalThis.elonmusk_114514_wait_startup.promise;
	});

	handler.response("request", async (request) => {
		return await globalThis.elonmusk_114514_request(request);
	});

	handler.response("addHook", async (name, priority) => {
		const hook = async (entry: TwitterApiHookEntry) => {
			if (target.isConnected) {
				return await runHook.request(name, entry);
			}
		};

		globalThis.elonmusk_114514_wxt_hooks?.push({ name, priority, hook });
		globalThis.elonmusk_114514_wxt_hooks?.sort((a, b) => b.priority - a.priority);
	});

	handler.response("removeHook", async (name) => {
		globalThis.elonmusk_114514_wxt_hooks = globalThis.elonmusk_114514_wxt_hooks?.filter((hook) => hook.name !== name);
	});
});

export default bridge;
