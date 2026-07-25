import { chromium, firefox, webkit } from "playwright";
import type { Settings } from "../utils/settings.ts";

type Browser = Settings["profiles"][number]["browser"];

export const connectProfileBrowser = async (profile: Browser) => {
	switch (profile.type) {
		case "launch": {
			const browser = { chromium, firefox, webkit }[profile.browserType];
			const context = await browser.launchPersistentContext(profile.userDataDir, {
				handleSIGINT: false,
				handleSIGTERM: false,
				handleSIGHUP: false,
				headless: profile.headless,
				channel: profile.channel,
				executablePath: profile.executablePath,
				env: profile.env,
				proxy: profile.proxy,
				args: ["--disable-blink-features=AutomationControlled", ...(profile.args || [])],
				viewport: profile.viewport,
			});
			return [context, () => context.close()] as const;
		}
		case "cdp": {
			const browser = { chromium, firefox, webkit }[profile.browserType];
			const cdpBrowser = await browser.connectOverCDP(profile.cdpEndpoint);
			const [context] = cdpBrowser.contexts();
			if (!context) {
				throw new Error("No context found in the connected browser");
			}
			return [context, () => cdpBrowser.close()] as const;
		}
	}
};
