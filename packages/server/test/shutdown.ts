import { describe, expect, it, vi } from "vitest";
import { registerGracefulShutdown } from "../src/utils/shutdown.js";

describe("registerGracefulShutdown", () => {
	it("closes the server and every profile page on SIGTERM", async () => {
		const handlers = new Map<string, () => void>();
		const runtime = {
			once: vi.fn((signal: string, listener: () => void) => {
				handlers.set(signal, listener);
			}),
			exit: vi.fn(),
		};
		const server = {
			close: vi.fn((callback: () => void) => callback()),
		};
		const firstPage = { close: vi.fn(async () => undefined) };
		const secondPage = { close: vi.fn(async () => Promise.reject(new Error("page already closed"))) };

		registerGracefulShutdown(server, [{ page: firstPage }, { page: secondPage }], runtime);
		handlers.get("SIGTERM")?.();
		await vi.waitFor(() => expect(runtime.exit).toHaveBeenCalledWith(0));

		expect(server.close).toHaveBeenCalledOnce();
		expect(firstPage.close).toHaveBeenCalledOnce();
		expect(secondPage.close).toHaveBeenCalledOnce();
		expect(runtime.once).toHaveBeenCalledWith("SIGINT", expect.any(Function));
		expect(runtime.once).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
	});

	it("runs shutdown only once when multiple signals arrive", async () => {
		const handlers = new Map<string, () => void>();
		const runtime = {
			once: vi.fn((signal: string, listener: () => void) => {
				handlers.set(signal, listener);
			}),
			exit: vi.fn(),
		};
		const server = {
			close: vi.fn((callback: () => void) => callback()),
		};
		const page = { close: vi.fn(async () => undefined) };

		registerGracefulShutdown(server, [{ page }], runtime);
		handlers.get("SIGTERM")?.();
		handlers.get("SIGINT")?.();
		await vi.waitFor(() => expect(runtime.exit).toHaveBeenCalledWith(0));

		expect(server.close).toHaveBeenCalledOnce();
		expect(page.close).toHaveBeenCalledOnce();
	});
});
