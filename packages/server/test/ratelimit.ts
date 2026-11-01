import { EventEmitter } from "node:events";
import type { Page } from "playwright";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createRateLimitStore, endpointOf, rateLimitHeadersOf, rateLimitOf } from "../src/utils/ratelimit.ts";

const headers = {
	"content-type": "application/json;charset=utf-8",
	"x-rate-limit-limit": "95",
	"x-rate-limit-remaining": "94",
	"x-rate-limit-reset": "1761900000",
};
const rateLimit = { limit: 95, remaining: 94, reset: 1761900000 };

// A client whose page emits the response event for the dispatched path, as the X page does
const createMockClient = (url: (path: string) => string) => {
	const page = new EventEmitter();
	const dispatch = async (request: unknown) => {
		const { path } = request as { path: string };
		page.emit("response", { url: () => url(path), allHeaders: async () => headers });
		return { ok: true, path };
	};
	return { page: page as unknown as Page, dispatch } as TwitterApiProfileClient;
};

describe("rate limit", () => {
	it("keys GraphQL by operation and REST by path", () => {
		expect(endpointOf("/graphql/AMIBMjtxEEATh4z8V9GtRg/UserByScreenName")).toBe("UserByScreenName");
		expect(endpointOf("/1.1/search/typeahead.json")).toBe("/1.1/search/typeahead.json");
	});

	it("reads the three headers and passes only them through", () => {
		expect(rateLimitOf(headers)).toEqual(rateLimit);
		expect(rateLimitOf({ "content-type": "application/json" })).toBeUndefined();
		expect(rateLimitHeadersOf(headers)).toEqual({
			"x-rate-limit-limit": "95",
			"x-rate-limit-remaining": "94",
			"x-rate-limit-reset": "1761900000",
		});
	});

	it("keeps the latest value per profile and endpoint", () => {
		const store = createRateLimitStore();
		store.update("a", "/graphql/q/Op", headers);
		store.update("a", "/graphql/q/Op", { ...headers, "x-rate-limit-remaining": "93" });
		store.update("a", "/1.1/x.json", {});
		store.update("b", "/1.1/x.json", headers);
		expect(store.state).toEqual({
			a: { Op: { ...rateLimit, remaining: 93 } },
			b: { "/1.1/x.json": rateLimit },
		});
	});

	it("passes X's headers through and serves them in /health", async () => {
		const url = (path: string) =>
			path.startsWith("/graphql/") ? `https://x.com/i/api${path}?a=1` : `https://api.x.com${path}`;
		const app = await createApp([{ name: "mock", getClient: async () => createMockClient(url) }]);

		const res = await app.request("/i/api/graphql/q/Op?variables=%7B%7D");
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, path: "/graphql/q/Op" });
		expect(res.headers.get("x-rate-limit-remaining")).toBe("94");
		expect(res.headers.get("content-type")).toContain("application/json");

		const rest = await app.request("/i/api/1.1/search/typeahead.json?q=elonmusk");
		expect(rest.headers.get("x-rate-limit-limit")).toBe("95");

		const health = await app.request("/health");
		expect(await health.json()).toEqual({
			status: "ok",
			profiles: ["mock"],
			rateLimit: { mock: { Op: rateLimit, "/1.1/search/typeahead.json": rateLimit } },
		});
	});

	it("ignores responses of other paths", async () => {
		const app = await createApp([
			{ name: "mock", getClient: async () => createMockClient(() => "https://x.com/i/api/graphql/q/Other") },
		]);
		const res = await app.request("/i/api/graphql/q/Op");
		expect(res.status).toBe(200);
		expect(res.headers.get("x-rate-limit-limit")).toBeNull();
		expect(((await (await app.request("/health")).json()) as any).rateLimit).toEqual({});
	});
});
