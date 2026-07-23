import boxen from "boxen";
import chalk from "chalk";
import ErrorStackParser from "error-stack-parser";

export const catchError = (error: unknown): string => {
	if (error instanceof AggregateError) {
		return catchErrorOne(
			error,
			error.errors.map((e) => catchError(e)),
		);
	} else if (error instanceof Error) {
		return catchErrorOne(error, []);
	} else {
		return boxen(chalk.red(JSON.stringify(error)), {
			padding: 1,
			borderColor: "red",
		});
	}
};

const catchErrorOne = (error: Error, children: string[]) => {
	const frames = ErrorStackParser.parse(error);
	const className = error.constructor?.name ?? "<unknown>";
	const trace = boxen(chalk.gray(frames.map((f) => `at ${f.toString()}`).join("\n")), {
		padding: 1,
		borderColor: "gray",
	});
	const childrenMessage = children.length ? `\n\n${children.join("\n\n")}` : "";
	const cause = error.cause ? `\nCaused by: ${String(error.cause)}` : "";
	return boxen(`${chalk.red(`${chalk.bold(className)}\n\n${error.message}${cause}`)}\n\n${trace}${childrenMessage}`, {
		padding: 1,
		borderColor: "red",
	});
};
