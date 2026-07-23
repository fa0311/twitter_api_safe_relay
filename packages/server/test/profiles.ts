import type { BrowserContext, Page } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../src/utils/settings.ts";

const mocks = vi.hoisted(() => ({
	connectBrowser: vi.fn(),
	createTwitterBrowser: vi.fn(),
	launchBrowser: vi.fn(),
}));

vi.mock("../src/utils/browser.ts", () => ({
	connectBrowser: mocks.connectBrowser,
	launchBrowser: mocks.launchBrowser,
}));

vi.mock("twitter-api-safe-request", () => ({
	createTwitterBrowser: mocks.createTwitterBrowser,
}));

import { createProfileClients } from "../src/utils/profiles.ts";

type Profile = Settings["profiles"][number];

const createProfile = (name: string, url = "https://x.com/home"): Profile => ({
	name,
	home: { url },
	browser: {
		type: "cdp",
		browserType: "chromium",
		cdpEndpoint: `http://${name}.example.test`,
	},
});

const createPage = (url: string) => ({ url: vi.fn(() => url), on: vi.fn() }) as unknown as Page;

const createContext = (pages: Page[], newPage: Page) =>
	({
		pages: vi.fn(() => pages),
		newPage: vi.fn(async () => newPage),
	}) as unknown as BrowserContext;

const createClient = (page: Page) => ({
	page,
	inject: vi.fn(async () => undefined),
	goto: vi.fn(async () => undefined),
});

describe("createProfileClients", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("reuses an existing page", async () => {
		const xPage = createPage("https://x.com/notifications");
		const newPage = createPage("about:blank");
		const context = createContext([xPage], newPage);
		const client = createClient(xPage);
		const close = vi.fn();
		mocks.connectBrowser.mockResolvedValue([context, close]);
		mocks.createTwitterBrowser.mockReturnValue(client);

		const result = await createProfileClients(createProfile("account1"));
		const created = await result.initialize();

		expect(context.newPage).not.toHaveBeenCalled();
		expect(mocks.createTwitterBrowser).toHaveBeenCalledWith(xPage);
		expect(client.inject).toHaveBeenCalledOnce();
		expect(client.goto).toHaveBeenCalledWith("https://x.com/home");
		expect(client.inject.mock.invocationCallOrder[0]!).toBeLessThan(client.goto.mock.invocationCallOrder[0]!);
		expect(created).toBe(client);

		expect(close).not.toHaveBeenCalled();
		await result.close();
		expect(close).toHaveBeenCalledOnce();
	});

	it("creates a page when the context has no page", async () => {
		const newPage = createPage("about:blank");
		const context = createContext([], newPage);
		const client = createClient(newPage);
		mocks.connectBrowser.mockResolvedValue([context, vi.fn()]);
		mocks.createTwitterBrowser.mockReturnValue(client);

		const result = await createProfileClients(createProfile("account1"));
		await result.initialize();

		expect(context.newPage).toHaveBeenCalledOnce();
		expect(mocks.createTwitterBrowser).toHaveBeenCalledWith(newPage);
	});
});
