import { describe, expect, it, vi } from "vitest";
import { createCleanup } from "../src/utils/cleanup.ts";

describe("createCleanup", () => {
	it("runs registered handlers on close", async () => {
		const cleanup = createCleanup();
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		await cleanup.close();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("runs handlers added after close immediately", async () => {
		const cleanup = createCleanup();
		await cleanup.close();
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("does not run handlers twice", async () => {
		const cleanup = createCleanup();
		const fn = vi.fn(async () => {});
		await cleanup.add(fn);
		await cleanup.close();
		await cleanup.close();
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("runs remaining handlers and throws AggregateError when a handler rejects", async () => {
		const cleanup = createCleanup();
		const fn = vi.fn(async () => {});
		await cleanup.add(async () => {
			throw new Error("boom");
		});
		await cleanup.add(fn);
		await expect(cleanup.close()).rejects.toThrow(AggregateError);
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
