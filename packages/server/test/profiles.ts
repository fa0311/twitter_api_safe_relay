import type { BrowserContext, Page } from "playwright";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Settings } from "../src/utils/settings.js";

const mocks = vi.hoisted(() => ({
	connectBrowser: vi.fn(),
	createTwitterBrowser: vi.fn(),
	launchBrowser: vi.fn(),
}));

vi.mock("../src/utils/browser.js", () => ({
	connectBrowser: mocks.connectBrowser,
	launchBrowser: mocks.launchBrowser,
}));

vi.mock("twitter-api-safe-request", () => ({
	createTwitterBrowser: mocks.createTwitterBrowser,
}));

import { createProfileClients } from "../src/utils/profiles.js";

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

const createPage = (url: string) => ({ url: vi.fn(() => url) }) as unknown as Page;

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

	it("reuses an existing page for the profile home origin", async () => {
		const blankPage = createPage("about:blank");
		const xPage = createPage("https://x.com/notifications");
		const newPage = createPage("about:blank");
		const context = createContext([blankPage, xPage], newPage);
		const client = createClient(xPage);
		mocks.connectBrowser.mockResolvedValue(context);
		mocks.createTwitterBrowser.mockReturnValue(client);

		const result = await createProfileClients([createProfile("account1")]);

		expect(context.newPage).not.toHaveBeenCalled();
		expect(mocks.createTwitterBrowser).toHaveBeenCalledWith(xPage);
		expect(client.inject).toHaveBeenCalledOnce();
		expect(client.goto).toHaveBeenCalledWith("https://x.com/home");
		expect(client.inject.mock.invocationCallOrder[0]).toBeLessThan(client.goto.mock.invocationCallOrder[0]);
		expect(result).toEqual([{ profile: createProfile("account1"), client }]);
	});

	it("creates a page when the context has no page for the home origin", async () => {
		const blankPage = createPage("about:blank");
		const newPage = createPage("about:blank");
		const context = createContext([blankPage], newPage);
		const client = createClient(newPage);
		mocks.connectBrowser.mockResolvedValue(context);
		mocks.createTwitterBrowser.mockReturnValue(client);

		await createProfileClients([createProfile("account1")]);

		expect(context.newPage).toHaveBeenCalledOnce();
		expect(mocks.createTwitterBrowser).toHaveBeenCalledWith(newPage);
	});

	it("does not initialize pages until every browser is connected", async () => {
		const goodNewPage = createPage("about:blank");
		const goodContext = createContext([], goodNewPage);
		let rejectBadConnection: (error: Error) => void = () => undefined;
		const badConnection = new Promise<BrowserContext>((_resolve, reject) => {
			rejectBadConnection = reject;
		});
		mocks.connectBrowser.mockImplementation(({ cdpEndpoint }: { cdpEndpoint: string }) =>
			cdpEndpoint.includes("account1") ? Promise.resolve(goodContext) : badConnection,
		);

		const startup = createProfileClients([createProfile("account1"), createProfile("account2")]);
		const rejection = expect(startup).rejects.toThrow("account2 connection failed");
		await vi.waitFor(() => expect(mocks.connectBrowser).toHaveBeenCalledTimes(2));
		await Promise.resolve();

		expect(goodContext.pages).not.toHaveBeenCalled();
		expect(goodContext.newPage).not.toHaveBeenCalled();

		rejectBadConnection(new Error("account2 connection failed"));
		await rejection;
		expect(mocks.createTwitterBrowser).not.toHaveBeenCalled();
	});
});
