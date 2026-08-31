export const createFatalLogger = () => {
	let logger = console.error;

	return {
		set: (error: (error: any) => void) => {
			logger = error;
		},
		fatal: (error: any) => {
			logger(error);
			process.exitCode = 1;
		},
	};
};
