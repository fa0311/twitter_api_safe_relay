#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { createHookManager, createTwitterBrowser, type TwitterApiHookEntry } from "twitter-api-safe-request";
import { collect, fromNdjson, PAGES, SEARCH_BOXES, toNdjson } from "./index.ts";

const { values } = parseArgs({
	options: {
		"user-data-dir": { type: "string", default: "./user_data" },
		cookies: { type: "string" }, // browser extension JSON export, added to the profile
		proxy: { type: "string" }, // http://user:pass@host:port
		channel: { type: "string" }, // e.g. chrome
		headless: { type: "boolean", default: false },
		out: { type: "string", default: "requests.ndjson" },
		responses: { type: "string" }, // directory that receives one response per operation
		page: { type: "string", multiple: true, default: [] },
	},
});

const proxy = (() => {
	if (values.proxy === undefined) {
		return undefined;
	}
	const url = new URL(values.proxy);
	return {
		server: `${url.protocol}//${url.host}`,
		username: decodeURIComponent(url.username),
		password: decodeURIComponent(url.password),
	};
})();

const context = await chromium.launchPersistentContext(values["user-data-dir"], {
	headless: values.headless,
	channel: values.channel,
	proxy,
});
context.setDefaultNavigationTimeout(120_000);
if (values.cookies !== undefined) {
	const list = JSON.parse(await fs.readFile(values.cookies, "utf-8")) as {
		name: string;
		value: string;
		domain: string;
	}[];
	await context.addCookies(
		list.map(({ name, value, domain }) => ({
			name,
			value,
			domain,
			path: "/",
			secure: true,
			sameSite: "None" as const,
		})),
	);
}

const page = context.pages()[0] ?? (await context.newPage());
const client = createTwitterBrowser(page);
await client.inject();
const entries: TwitterApiHookEntry[] = [];
const hooks = createHookManager();
hooks.addHook("twitter-api-safe-dump", (entry) => {
	entries.push(entry);
});
await client.initHook(hooks.runHooks);

await client.goto("https://x.com/home");
const me = await page.getAttribute('a[data-testid="AppTabBar_Profile_Link"]', "href");
const pages = [...PAGES, ...values.page].flatMap((p) =>
	p.includes("{me}") ? (me ? [p.replace("{me}", me)] : []) : [p],
);

for (const p of pages) {
	console.error(`visit ${p}`);
	await client.goto(`https://x.com${p}`);
	await page.waitForTimeout(6000);
	const box = SEARCH_BOXES[p];
	if (box !== undefined) {
		await page.locator(`[aria-label="${box}"]`).first().click();
		await page.getByPlaceholder(box).first().fill("test");
		await page.keyboard.press("Enter");
		await page.waitForTimeout(6000);
	}
	for (const tab of await page.locator('[role="tab"]').all()) {
		try {
			await tab.click({ timeout: 3000 });
			await page.waitForTimeout(3000);
		} catch {}
	}
}
await context.close();

const previous = await fs.readFile(values.out, "utf-8").then(fromNdjson, () => []);
const catalog = collect([...previous, ...entries]);
await fs.writeFile(values.out, toNdjson(catalog));
if (values.responses !== undefined) {
	await fs.mkdir(values.responses, { recursive: true });
	for (const entry of catalog) {
		await fs.writeFile(path.join(values.responses, `${entry.name}.json`), JSON.stringify(entry.response));
	}
}
console.error(
	`${catalog.length} operations (${entries.length} requests recorded, ${previous.length} lines kept from the previous file) -> ${values.out}`,
);
