export const createCleanup = () => {
	const handlers: (() => Promise<void>)[] = [];
	let closed = false;

	const add = async (fn: () => Promise<void>) => {
		if (closed) {
			await fn();
		} else {
			handlers.push(fn);
		}
	};

	const close = async () => {
		closed = true;
		const results = await Promise.allSettled(handlers.splice(0).map((fn) => fn()));
		const errors = results.filter((result) => result.status === "rejected");
		if (errors.length > 0) {
			throw new AggregateError(errors.map((error) => error.reason));
		}
	};

	return { add, close };
};
