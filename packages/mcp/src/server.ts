#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { catchError, createCleanup, createDefaultSettings, loadCliSettings, startRelay } from "twitter-api-safe-relay";
import createMcpServer from "./app.ts";
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
			throw new Error("No settings file specified. Usage: twitter-api-safe-mcp <settings-file>");
		}
	})();

	const relay = await startRelay(settings, async ({ clients, close }) => {
		await cleanup.add(close);
		const server = createMcpServer(clients);
		await cleanup.add(async () => await server.close());
		server.server.onclose = async () => {
			await cleanup.close();
		};
		await server.connect(new StdioServerTransport());
	});
	await cleanup.add(relay.close);
	await relay.run();
} catch (error) {
	console.error(catchError(error));
	process.exitCode = 1;
} finally {
	await cleanup.close();
}
