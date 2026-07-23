import { serve } from "@hono/node-server";
import type { Hono } from "hono";
import type { AppOptions } from "./utils/app.ts";
import { createCleanup } from "./utils/cleanup.ts";
import { createDefaultSettings, loadCliSettings } from "./utils/cli.ts";
import { catchError } from "./utils/error.ts";
import { createLogger } from "./utils/logger.ts";
import { createProfileClients } from "./utils/profiles.ts";

export type StartRelayOptions = {
	createApp: (clients: AppOptions[]) => Promise<Hono>;
};

export const startRelay = async (options: StartRelayOptions) => {
	const [file] = process.argv.slice(2);

	const cleanup = createCleanup();

	process.once("SIGTERM", async () => {
		await cleanup.close();
	});

	await (async () => {
		const settings = await (async () => {
			if (file) {
				return await loadCliSettings(file);
			} else if (process.stdin.isTTY) {
				return await createDefaultSettings();
			} else {
				throw new Error("No settings file specified. Usage: twitter-api-safe-relay <settings-file>");
			}
		})();

		const logger = createLogger({ logLevel: settings.logLevel, logPrettyPrint: settings.logPrettyPrint });

		const clients = await Promise.all(
			settings.profiles.map(async (profile) => {
				const { close, emitter, initialize } = await createProfileClients(profile);
				await cleanup.add(close);
				emitter.on("close", async ({ profileName }) => {
					logger.info(`Browser closed for profile "${profileName}"`);
					await cleanup.close();
				});
				emitter.on("reload", ({ profileName }) => {
					logger.info(`Page reloaded for profile "${profileName}"`);
				});
				emitter.on("crash", ({ profileName }) => {
					logger.error(`Page crashed for profile "${profileName}"`);
				});
				emitter.on("error", ({ profileName, error }) => {
					logger.error(`Error occurred for profile "${profileName}": ${error}`);
				});

				const client = await initialize();
				logger.info(`Browser for profile "${profile.name}" launched successfully`);

				return { name: profile.name, client };
			}),
		);

		const app = await options.createApp(clients);

		logger.info(`Server is running on http://localhost:${settings.port}`);
		logger.info(`Available profiles: ${settings.profiles.map((profile) => profile.name).join(", ")}`);

		const server = serve({ fetch: app.fetch, port: settings.port });
		await cleanup.add(async () => void server.close());

		await new Promise((resolve, reject) => {
			server.on("error", (error) => {
				reject(error);
			});
			server.on("close", () => {
				resolve(undefined);
			});
		});
	})().catch(async (error) => {
		console.log(catchError(error));
		process.exitCode = 1;
		await cleanup.close();
	});
};
