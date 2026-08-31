import { describe, expect, it } from "vitest";
import { createMutex } from "../src/utils/mutex.ts";

describe("createMutex", () => {
	it("serializes concurrent locks", async () => {
		const mutex = createMutex();
		const order: string[] = [];
		const first = mutex.lock(async () => {
			order.push("first:start");
			await new Promise((resolve) => setTimeout(resolve, 10));
			order.push("first:end");
		});
		const second = mutex.lock(async () => {
			order.push("second");
		});
		await Promise.all([first, second]);
		expect(order).toEqual(["first:start", "first:end", "second"]);
	});

	it("propagates the callback error to its caller", async () => {
		const mutex = createMutex();
		await expect(
			mutex.lock(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
	});

	it("continues after a failed lock", async () => {
		const mutex = createMutex();
		await expect(
			mutex.lock(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");
		expect(await mutex.lock(async () => "ok")).toBe("ok");
	});
});
