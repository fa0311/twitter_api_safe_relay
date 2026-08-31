import { catchError } from "./error.ts";

export const createFatalLogger = () => {
	let logger = console.error;

	return {
		set: (error: (error: any) => void) => {
			logger = error;
		},
		fatal: (error: any) => {
			logger(catchError(error));
			process.exitCode = 1;
		},
	};
};
