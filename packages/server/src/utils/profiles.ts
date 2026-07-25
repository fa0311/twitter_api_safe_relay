import { EventEmitter } from "node:events";
import { createTwitterBrowser } from "twitter-api-safe-request";
import { connectProfileBrowser } from "./browser.ts";
import { createCleanup } from "./cleanup.ts";
import type { Settings } from "./settings.ts";

type ProfileEvents = {
	reload: [event: { profileName: string }];
	crash: [event: { profileName: string }];
	error: [event: { profileName: string; error: Error }];
	close: [event: { profileName: string }];
	pageerror: [event: { profileName: string; error: Error }];
};

type Profile = Settings["profiles"][number];

export const createProfileClients = async () => {
	const emitter = new EventEmitter<ProfileEvents>();
	const cleanup = createCleanup();

	return {
		close: cleanup.close,
		emitter: emitter,
		initialize: async (profile: Profile) => {
			const [context, close] = await connectProfileBrowser(profile.browser);
			await cleanup.add(close);

			context.on("close", async () => {
				emitter.emit("close", { profileName: profile.name });
			});

			const page = context.pages()[0] ?? (await context.newPage());
			const client = createTwitterBrowser(page);
			await client.inject();
			await client.goto(profile.home.url);

			if (profile.pageReloadIntervalMinutes) {
				const call = async () => {
					emitter.emit("reload", { profileName: profile.name });
					await client.page.reload().catch((error) => {
						emitter.emit("error", { profileName: profile.name, error });
					});
				};
				const timer = setInterval(call, profile.pageReloadIntervalMinutes * 60_000);
				await cleanup.add(async () => clearInterval(timer));
			}
			client.page.on("crash", async () => {
				emitter.emit("crash", { profileName: profile.name });
				await client.page.reload().catch((error) => {
					emitter.emit("error", { profileName: profile.name, error });
				});
			});
			client.page.on("pageerror", async (error) => {
				emitter.emit("pageerror", { profileName: profile.name, error });
				await client.page.reload().catch((error) => {
					emitter.emit("error", { profileName: profile.name, error });
				});
			});

			return client;
		},
	};
};
