import { EventEmitter } from "node:events";
import { match } from "ts-pattern";
import { createTwitterBrowser } from "twitter-api-safe-request";

import { connectBrowser, launchBrowser } from "./browser.ts";
import type { Settings } from "./settings.ts";

type ProfileEvents = {
	reload: [event: { profileName: string }];
	crash: [event: { profileName: string }];
	error: [event: { profileName: string; error: unknown }];
};

type Profile = Settings["profiles"][number];

const connectProfileBrowser = async (profile: Profile) => {
	return match(profile.browser)
		.with({ type: "launch" }, (settings) =>
			launchBrowser({
				browserType: settings.browserType,
				channel: settings.channel,
				userDataDir: settings.userDataDir,
				headless: settings.headless,
				executablePath: settings.executablePath,
				env: settings.env,
				proxy: settings.proxy,
				args: settings.args,
				viewport: settings.viewport,
			}),
		)
		.with({ type: "cdp" }, (settings) =>
			connectBrowser({
				browserType: settings.browserType,
				cdpEndpoint: settings.cdpEndpoint,
			}),
		)
		.exhaustive();
};

export const createProfileClients = async (profile: Profile) => {
	const emitter = new EventEmitter<ProfileEvents>();

	const [context, close] = await connectProfileBrowser(profile);
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
		setInterval(call, profile.pageReloadIntervalMinutes * 60_000);
	}
	client.page.on("crash", async () => {
		emitter.emit("crash", { profileName: profile.name });
		await client.page.reload().catch((error) => {
			emitter.emit("error", { profileName: profile.name, error });
		});
	});

	return { client, close, emitter };
};
