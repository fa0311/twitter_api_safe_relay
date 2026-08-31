import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSuspender } from "../src/utils/suspender.ts";

const createRun = () => {
	let sequence = 0;
	const closes: ReturnType<typeof vi.fn>[] = [];
	const run = vi.fn(async () => {
		sequence += 1;
		const close = vi.fn(async () => undefined);
		closes.push(close);
		return { result: sequence, close };
	});
	return { run, closes };
};

describe("createSuspender", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("caches the result and extends the idle timer on each run", async () => {
		const { run, closes } = createRun();
		const suspender = createSuspender({ delay: 1000, run });

		expect(await suspender.run()).toBe(1);
		await vi.advanceTimersByTimeAsync(900);
		expect(await suspender.run()).toBe(1);
		await vi.advanceTimersByTimeAsync(900);
		expect(run).toHaveBeenCalledOnce();
		expect(closes[0]).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(100);
		expect(closes[0]).toHaveBeenCalledOnce();
	});

	it("recreates after the idle reset", async () => {
		const { run } = createRun();
		const suspender = createSuspender({ delay: 1000, run });

		expect(await suspender.run()).toBe(1);
		await vi.advanceTimersByTimeAsync(1000);
		expect(await suspender.run()).toBe(2);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("shares one creation between concurrent runs", async () => {
		const { run, closes } = createRun();
		const suspender = createSuspender({ delay: 1000, run });

		const [first, second] = await Promise.all([suspender.run(), suspender.run()]);
		expect(first).toBe(1);
		expect(second).toBe(1);
		expect(run).toHaveBeenCalledOnce();

		// the concurrent arms leave a single timer behind: later runs keep extending it
		await vi.advanceTimersByTimeAsync(900);
		await suspender.run();
		await vi.advanceTimersByTimeAsync(900);
		expect(closes[0]).not.toHaveBeenCalled();
	});

	it("close tears down the generation and cancels the pending reset", async () => {
		const { run, closes } = createRun();
		const suspender = createSuspender({ delay: 1000, run });

		await suspender.run();
		await suspender.close();
		expect(closes[0]).toHaveBeenCalledOnce();

		await vi.advanceTimersByTimeAsync(5000);
		expect(closes[0]).toHaveBeenCalledOnce();
	});
});
