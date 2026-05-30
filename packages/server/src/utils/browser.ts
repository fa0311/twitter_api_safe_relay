import { chromium, firefox, webkit } from "playwright";

type LaunchBrowserSettings = {
	browserType: "chromium" | "firefox" | "webkit";
	userDataDir: string;
	headless: boolean | undefined;
	executablePath: string | undefined;
	env: NodeJS.ProcessEnv | undefined;
	proxy: { server: string; username?: string; password?: string } | undefined;
	args: string[] | undefined;
	viewport: { width: number; height: number } | undefined;
};

type CdpBrowserSettings = {
	browserType: "chromium" | "firefox" | "webkit";
	cdpEndpoint: string;
};

export const launchBrowser = async (settings: LaunchBrowserSettings) => {
	const browser = { chromium, firefox, webkit }[settings.browserType];
	const context = await browser.launchPersistentContext(settings.userDataDir, {
		headless: settings.headless,
		executablePath: settings.executablePath,
		env: settings.env,
		proxy: settings.proxy,
		args: ["--disable-blink-features=AutomationControlled", ...(settings.args || [])],
		viewport: settings.viewport,
	});
	return context;
};

export const connectBrowser = async (settings: CdpBrowserSettings) => {
	const browser = { chromium, firefox, webkit }[settings.browserType];
	const cdpBrowser = await browser.connectOverCDP(settings.cdpEndpoint);
	const context = cdpBrowser.contexts()[0] ?? (await cdpBrowser.newContext());
	return context;
};
