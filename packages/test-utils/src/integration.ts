import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type BrowserContext, type BrowserContextOptions, type Cookie, chromium } from "playwright";

type Cleanup = () => Promise<void> | void;

export type Integration = {
	temp: () => Promise<string>;
	cookies: () => Promise<Cookie[]>;
	proxy: () => BrowserContextOptions["proxy"];
	browser: () => Promise<BrowserContext>;
	cleanup: (fn: Cleanup) => void;
	afterEachCall: () => Promise<void>;
};

export const createIntegration = (): Integration => {
	const cleanupFns: Cleanup[] = [];

	const cleanup = (fn: Cleanup) => {
		cleanupFns.push(fn);
	};

	const temp = async () => {
		const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "twitter-api-safe-test-"));
		cleanup(() => fs.promises.rm(tempDir, { recursive: true, force: true }));
		return tempDir;
	};

	// X_COOKIE_FILE: cookies exported from a logged-in x.com session (browser extension JSON)
	const cookies = async () => {
		const file = process.env.X_COOKIE_FILE;
		if (!file) {
			return [];
		}
		const list = JSON.parse(await fs.promises.readFile(file, "utf8")) as { name: string; value: string; domain: string }[];
		return list.map(({ name, value, domain }) => ({ name, value, domain, path: "/", secure: true, sameSite: "None" as const }));
	};

	// X_PROXY_URL: http://user:pass@host:port used by the browser (Chromium only authenticates against HTTP proxies)
	const proxy = () => {
		const url = process.env.X_PROXY_URL;
		if (!url) {
			return undefined;
		}
		const parsed = new URL(url);
		return {
			server: `${parsed.protocol}//${parsed.host}`,
			username: decodeURIComponent(parsed.username),
			password: decodeURIComponent(parsed.password),
		};
	};

	const browser = async () => {
		const context = await chromium.launchPersistentContext(await temp(), {
			headless: true,
			proxy: proxy(),
		});
		await context.addCookies(await cookies());
		cleanup(() => context.close());
		return context;
	};

	const afterEachCall = async () => {
		for (const fn of cleanupFns.splice(0).reverse()) {
			await fn();
		}
	};

	return { temp, cookies, proxy, browser, cleanup, afterEachCall };
};
