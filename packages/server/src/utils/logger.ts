import pino from "pino";
import pinoPretty from "pino-pretty";

type LoggerSettings = {
	logLevel: string;
	logPrettyPrint: boolean;
};

export const createLogger = (settings: LoggerSettings) => {
	const options = {
		level: settings.logLevel,
		timestamp: pino.stdTimeFunctions.isoTime,
	};
	return settings.logPrettyPrint ? pino(options, pinoPretty()) : pino(options);
};
