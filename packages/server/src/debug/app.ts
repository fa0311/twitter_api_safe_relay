import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { createHookManager } from "twitter-api-safe-request";
import type { AppOptions } from "../utils/app.js";
import { createCounter } from "../utils/counter.js";

export const createDebugApp = (clients: AppOptions[]) => {
	const listeners = new Set<(entry: unknown) => void>();
	const app = new Hono();

	app.get("/api/events", (c) => {
		return streamSSE(c, async (stream) => {
			const listener = (entry: unknown) => {
				void stream.writeSSE({
					event: "entry",
					data: JSON.stringify(entry),
				});
			};
			listeners.add(listener);

			const { signal } = c.req.raw;
			if (!signal.aborted) {
				await new Promise<void>((resolve) => {
					signal.addEventListener("abort", () => resolve(), { once: true });
				});
			}
			listeners.delete(listener);
		});
	});

	const emit = (entry: unknown) => {
		for (const listener of listeners) {
			listener(entry);
		}
	};
	const count = createCounter();

	app.get("/api/enable-debug", (c) => {
		return c.json({ enabled: count.getCount() > 0 });
	});

	app.post("/api/enable-debug", async (c) => {
		const currentCount = count.increment();
		if (currentCount === 1) {
			await Promise.all(
				clients.map(async ({ client }) => {
					await client.inject();
					await client.goto(client.page.url());
					const hooks = createHookManager();
					hooks.addHook("twitter-api-safe-dashboard:debug", (entry) => {
						emit(entry);
					});
					await client.initHook(hooks.runHooks);
				}),
			);

			return c.json({ success: true, message: "Debug mode enabled" });
		} else {
			return c.json({ success: false, message: "Debug mode is already enabled" });
		}
	});
	return app;
};
