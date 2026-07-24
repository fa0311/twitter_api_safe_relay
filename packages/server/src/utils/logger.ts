import pino from "pino";
import pinoPretty from "pino-pretty";
import type { Settings } from "./settings.ts";

type Logger = Settings["logger"];

export const createLogger = (logger: Logger) => {
	switch (logger.output.type) {
		case "stdout": {
			const options = {
				level: logger.level,
				timestamp: pino.stdTimeFunctions.isoTime,
			};
			if (logger.output.prettyPrint.enabled) {
				return pino(options, pinoPretty());
			} else {
				return pino(options);
			}
		}
		case "file": {
			const options = {
				level: logger.level,
				timestamp: pino.stdTimeFunctions.isoTime,
			};
			if (logger.output.prettyPrint.enabled) {
				return pino(options, pinoPretty({ destination: logger.output.filePath }));
			} else {
				return pino(options, pino.destination(logger.output.filePath));
			}
		}
	}
};
