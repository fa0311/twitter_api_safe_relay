import { EventEmitter } from "node:events";
import { createTwitterBrowser, type TwitterApiProfileClient } from "twitter-api-safe-request";
import { connectProfileBrowser } from "./browser.ts";
import { createCleanup } from "./cleanup.ts";
import type { Settings } from "./settings.ts";
import { createSuspender } from "./suspender.ts";

type ProfileEvents = {
	reload: [event: { profileName: string }];
	crash: [event: { profileName: string }];
	error: [event: { profileName: string; error: Error }];
	close: [event: { profileName: string }];
	pageerror: [event: { profileName: string; error: Error }];
};

type Profile = Settings["profiles"][number];

export type ProfileClientGetter = () => Promise<TwitterApiProfileClient>;

export const createProfileClients = async () => {
	const emitter = new EventEmitter<ProfileEvents>();
	const cleanup = createCleanup({ reuse: false });

	return {
		close: cleanup.close,
		emitter: emitter,
		initialize: async (profile: Profile) => {
			const launch = async () => {
				return async () => {
					const cleanup = createCleanup({ reuse: false });
					const [context, close] = await connectProfileBrowser(profile.browser);
					await cleanup.add(async () => await close());
					context.on("close", async () => {
						emitter.emit("close", { profileName: profile.name });
					});

					const page = context.pages()[0] ?? (await context.newPage());
					const client = createTwitterBrowser(page);
					await client.inject();

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

					return { result: client, close: cleanup.close };
				};
			};

			const cdp = async () => {
				const [context, close] = await connectProfileBrowser(profile.browser);
				await cleanup.add(async () => await close());
				context.on("close", async () => {
					emitter.emit("close", { profileName: profile.name });
					emitter.emit("error", { profileName: profile.name, error: new Error("Browser connection closed") });
				});

				const page = context.pages()[0] ?? (await context.newPage());
				const client = createTwitterBrowser(page);
				await client.inject();

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

				return async () => {
					const cleanup = createCleanup({ reuse: false });
					await client.goto(profile.home.url);
					await cleanup.add(async () => {
						await client.page.goto("about:blank");
					});

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

					return { result: client, close: cleanup.close };
				};
			};

			const suspender = createSuspender({
				delay: profile.pageIdleTimeoutMinutes ? profile.pageIdleTimeoutMinutes * 60_000 : undefined,
				run: await (async () => {
					switch (profile.browser.type) {
						case "cdp":
							return await cdp();
						case "launch":
							return await launch();
					}
				})(),
			});

			await cleanup.add(async () => await suspender.close());
			suspender.emitter.on("error", ({ error }) => {
				emitter.emit("error", { profileName: profile.name, error });
			});
			return suspender.run;
		},
	};
};
