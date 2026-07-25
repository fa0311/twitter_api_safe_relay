type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

const ok = <T>(data: T): Result<T, never> => ({ success: true, data });

const err = <E>(error: E): Result<never, E> => ({ success: false, error });

export const createShutdown = () => {
	const resolver = Promise.withResolvers<Result<undefined>>();

	return {
		close: () => {
			resolver.resolve(ok(undefined));
		},
		error: (error: Error) => {
			resolver.resolve(err(error));
		},
		wait: async () => {
			const result = await resolver.promise;
			if (!result.success) {
				throw result.error;
			}
		},
	};
};
