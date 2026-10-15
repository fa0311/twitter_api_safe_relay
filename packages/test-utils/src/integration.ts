import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type BrowserContext, type Cookie, chromium } from "playwright";

type Cleanup = () => Promise<void> | void;

export type Integration = {
	temp: () => Promise<string>;
	cookies: () => Promise<Cookie[]>;
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

	const browser = async () => {
		const context = await chromium.launchPersistentContext(await temp(), {
			headless: true,
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

	return { temp, cookies, browser, cleanup, afterEachCall };
};
