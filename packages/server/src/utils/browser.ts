import { chromium, firefox, webkit } from "playwright";

type CreateBrowserSettings = {
	browserType: "chromium" | "firefox" | "webkit";
	userDataDir: string;
	headless: boolean | undefined;
	executablePath: string | undefined;
	env: NodeJS.ProcessEnv | undefined;
	proxy: { server: string; username?: string; password?: string } | undefined;
	args: string[] | undefined;
	viewport: { width: number; height: number } | undefined;
};

export const createBrowser = async (settings: CreateBrowserSettings) => {
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
