type ClosableServer = {
	close: (callback?: (error?: Error) => void) => unknown;
};

type ClosableClient = {
	page: {
		close: () => Promise<unknown>;
	};
};

type SignalRuntime = {
	once: (signal: "SIGINT" | "SIGTERM", listener: () => void) => unknown;
	exit: (code: number) => unknown;
};

export const registerGracefulShutdown = (
	server: ClosableServer,
	clients: ClosableClient[],
	runtime: SignalRuntime = process,
) => {
	let shuttingDown = false;
	const shutdown = async () => {
		if (shuttingDown) return;
		shuttingDown = true;

		const closeServer = new Promise<void>((resolve) => {
			server.close(() => resolve());
		});
		await Promise.allSettled([closeServer, ...clients.map((client) => client.page.close())]);
		runtime.exit(0);
	};

	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		runtime.once(signal, () => void shutdown());
	}
};
