import { describe, expect, it, vi } from "vitest";
import { createCleanup } from "../src/utils/cleanup.ts";

describe("createCleanup", () => {
	it("runs registered handlers on close", async () => {
		const cleanup = createCleanup({ reuse: false });
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		await cleanup.close();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("runs handlers added after close immediately", async () => {
		const cleanup = createCleanup({ reuse: false });
		await cleanup.close();
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("does not run handlers twice", async () => {
		const cleanup = createCleanup({ reuse: false });
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		await cleanup.close();
		await cleanup.close();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("accepts new handlers after close when reuse is enabled", async () => {
		const cleanup = createCleanup({ reuse: true });
		const first = vi.fn(async () => {});
		await cleanup.add(first);
		await cleanup.close();
		expect(first).toHaveBeenCalledTimes(1);

		const second = vi.fn(async () => {});
		await cleanup.add(second);
		expect(second).not.toHaveBeenCalled();
		await cleanup.close();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("runs remaining handlers and throws AggregateError when a handler rejects", async () => {
		const cleanup = createCleanup({ reuse: false });
		const fn = vi.fn(async () => {});
		await cleanup.add(async () => {
			throw new Error("boom");
		});
		await cleanup.add(fn);
		await expect(cleanup.close()).rejects.toThrow(AggregateError);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
