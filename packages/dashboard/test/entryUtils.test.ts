import { describe, expect, it } from "vitest";
import { buildEntry, defaultScriptOf, statsOf } from "../src/entryUtils";

const rawEvent = (request: unknown) => ({
	receivedAt: 2_000,
	request,
	requestAt: 1_000,
	response: { ok: true },
});

describe("buildEntry", () => {
	it("builds REST entries with version, label, and searchable text", () => {
		const entry = buildEntry(
			rawEvent({
				headers: {},
				method: "GET",
				params: { q: "from:twitterdev" },
				path: "/2/tweets/search/recent.json",
			}),
			7,
		);

		expect(entry).toMatchObject({
			id: 7,
			label: "recent",
			method: "GET",
			path: "/2/tweets/search/recent.json",
			version: "v2",
		});
		expect(entry.searchText).toContain("from:twitterdev");
		expect(entry.searchText).toContain("v2");
	});

	it("parses GraphQL GET request payloads", () => {
		const entry = buildEntry(
			rawEvent({
				method: "GET",
				params: {
					features: JSON.stringify({ responsive_web_graphql_timeline_navigation_enabled: true }),
					fieldToggles: JSON.stringify({ withArticleRichContentState: false }),
					variables: JSON.stringify({ tweetId: "123" }),
				},
				path: "/graphql/qid-1/TweetResultByRestId",
			}),
			3,
		);

		expect(entry).toMatchObject({
			label: "TweetResultByRestId",
			method: "GET",
			operationName: "TweetResultByRestId",
			queryId: "qid-1",
			version: "graphql",
		});
		if (entry.version !== "graphql") throw new Error("Expected GraphQL entry");
		expect(entry.variables).toEqual({ tweetId: "123" });
		expect(entry.features).toEqual({ responsive_web_graphql_timeline_navigation_enabled: true });
		expect(entry.fieldToggles).toEqual({ withArticleRichContentState: false });
	});

	it("uses empty GraphQL GET payload sections when params are missing", () => {
		const entry = buildEntry(
			rawEvent({
				method: "GET",
				params: {},
				path: "/graphql/qid-2/HomeTimeline",
			}),
			4,
		);

		if (entry.version !== "graphql") throw new Error("Expected GraphQL entry");
		expect(entry.variables).toEqual({});
		expect(entry.features).toEqual({});
		expect(entry.fieldToggles).toEqual({});
	});

	it("counts entries by version", () => {
		const entries = [
			buildEntry(rawEvent({ headers: {}, method: "GET", params: {}, path: "/1.1/statuses/home_timeline.json" }), 1),
			buildEntry(rawEvent({ headers: {}, method: "GET", params: {}, path: "/2/users/me" }), 2),
			buildEntry(rawEvent({ data: {}, method: "POST", path: "/graphql/qid-3/CreateTweet" }), 3),
		];

		expect(statsOf(entries)).toEqual({
			graphql: 1,
			total: 3,
			v11: 1,
			v2: 1,
		});
	});

	it("rejects unsupported request paths", () => {
		expect(() => buildEntry(rawEvent({ headers: {}, method: "GET", params: {}, path: "/settings" }), 1)).toThrow(
			"Path does not match v1.1, v2, or graphql",
		);
	});
});

describe("defaultScriptOf", () => {
	it("creates relay script for REST GET entries", () => {
		const entry = buildEntry(
			rawEvent({
				headers: {},
				method: "GET",
				params: { "user.fields": "id,name" },
				path: "/2/users/me",
			}),
			1,
		);

		const script = defaultScriptOf(entry);

		expect(script).toContain("new URLSearchParams");
		expect(script).toContain('"user.fields": "id,name"');
		expect(script).toContain("return await fetch(`/2/users/me?${params}`");
	});

	it("creates relay script for GraphQL POST entries", () => {
		const entry = buildEntry(
			rawEvent({
				data: {
					features: { responsive_web_edit_tweet_api_enabled: true },
					fieldToggles: { withArticlePlainText: false },
					variables: { text: "hello" },
				},
				method: "POST",
				path: "/graphql/qid-4/CreateTweet",
			}),
			1,
		);

		const script = defaultScriptOf(entry);

		expect(script).toContain('return await fetch("/i/api/graphql/qid-4/CreateTweet"');
		expect(script).toContain('"text": "hello"');
		expect(script).toContain('"responsive_web_edit_tweet_api_enabled": true');
		expect(script).toContain('"withArticlePlainText": false');
	});
});
