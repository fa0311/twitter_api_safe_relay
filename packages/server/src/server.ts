#!/usr/bin/env node

import { startRelay } from "./start.ts";
import { createCleanup } from "./utils/cleanup.ts";
import { createDefaultSettings, loadCliSettings } from "./utils/cli.ts";
import { catchError } from "./utils/error.ts";
import { parseSettings } from "./utils/settings.ts";

const cleanup = createCleanup();

process.once("SIGTERM", async () => {
	await cleanup.close();
});

try {
	const [file] = process.argv.slice(2);

	const settings = await (async () => {
		if (file) {
			const data = await loadCliSettings(file);
			return parseSettings(data);
		} else if (process.stdin.isTTY) {
			const data = await createDefaultSettings();
			return parseSettings(data);
		} else {
			throw new Error("No settings file specified. Usage: twitter-api-safe-relay <settings-file>");
		}
	})();

	const relay = await startRelay(settings, async () => {});
	await cleanup.add(relay.close);
	await relay.run();
} catch (error) {
	console.error(catchError(error));
	process.exitCode = 1;
} finally {
	await cleanup.close();
}
