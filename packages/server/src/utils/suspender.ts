import EventEmitter from "node:events";
import { createCleanup } from "./cleanup.ts";
import { createMutex } from "./mutex.ts";

type SuspenderEvents = {
	error: [event: { error: Error }];
};

type Suspender<T> = {
	delay: number | undefined;
	run: () => Promise<{ result: T; close: () => Promise<void> }>;
};

export const createSuspender = <T>({ delay, run }: Suspender<T>) => {
	const cleanup = createCleanup({ reuse: true });
	const mutex = createMutex();
	let cache: T | undefined;
	let timer: NodeJS.Timeout | undefined;

	const emitter = new EventEmitter<SuspenderEvents>();

	const reset = async () => {
		cache = undefined;
		timer = undefined;
		await cleanup.close();
	};

	const clearTimer = () => {
		if (timer) {
			clearTimeout(timer);
			timer = undefined;
		}
	};

	return {
		emitter,
		close: async () => {
			clearTimer();
			await reset();
		},
		run: async () => {
			const result = await mutex.lock(async () => {
				if (cache === undefined) {
					const created = await run();
					cache = created.result;
					await cleanup.add(created.close);
				}
				return cache;
			});
			if (delay !== undefined) {
				clearTimer();
				timer = setTimeout(async () => {
					try {
						await reset();
					} catch (error) {
						emitter.emit("error", { error: error as Error });
					}
				}, delay);
			}

			return result;
		},
	};
};
