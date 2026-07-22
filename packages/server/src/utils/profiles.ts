import { match } from "ts-pattern";
import { createTwitterBrowser } from "twitter-api-safe-request";
import { connectBrowser, launchBrowser } from "./browser.js";
import type { Settings } from "./settings.js";

type Profile = Settings["profiles"][number];

const connectProfileBrowser = (profile: Profile) =>
	match(profile.browser)
		.with({ type: "launch" }, (settings) =>
			launchBrowser({
				browserType: settings.browserType,
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

const hasOrigin = (url: string, origin: string) => {
	try {
		return new URL(url).origin === origin;
	} catch {
		return false;
	}
};

export const createProfileClients = async (
	profiles: Settings["profiles"],
	onBrowserConnected?: (profile: Profile) => void,
) => {
	const connectedProfiles = await Promise.all(
		profiles.map(async (profile) => {
			const context = await connectProfileBrowser(profile);
			onBrowserConnected?.(profile);
			return { profile, context };
		}),
	);

	return Promise.all(
		connectedProfiles.map(async ({ profile, context }) => {
			const homeOrigin = new URL(profile.home.url).origin;
			const page =
				context.pages().find((candidate) => hasOrigin(candidate.url(), homeOrigin)) ?? (await context.newPage());
			const client = createTwitterBrowser(page);
			await client.inject();
			await client.goto(profile.home.url);
			return { profile, client };
		}),
	);
};
