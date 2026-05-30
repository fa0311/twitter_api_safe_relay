import { Hono } from "hono";
import { streamSSE } from "hono/streaming";

export const createDebugApp = () => {
	const listeners = new Set<(entry: unknown) => void>();
	const app = new Hono();

	app.get("/api/events", (c) =>
		streamSSE(c, async (stream) => {
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
		}),
	);

	const emit = (entry: unknown) => {
		for (const listener of listeners) {
			listener(entry);
		}
	};

	return { app, emit } as const;
};
