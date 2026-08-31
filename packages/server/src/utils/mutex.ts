export const createMutex = () => {
	let queue: Promise<unknown> = Promise.resolve();

	const lock = <T>(fn: () => Promise<T>): Promise<T> => {
		const result = (async () => {
			try {
				await queue;
			} catch {}
			return await fn();
		})();
		queue = result;
		return result;
	};

	return { lock };
};
