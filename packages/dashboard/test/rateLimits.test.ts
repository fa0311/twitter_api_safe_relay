import { describe, expect, it } from "vitest";
import { rateLimitRowsOf } from "../src/rateLimits.ts";

describe("rateLimitRowsOf", () => {
	it("flattens /health into rows sorted by profile and endpoint", () => {
		const rows = rateLimitRowsOf({
			status: "ok",
			profiles: ["b", "a"],
			rateLimit: {
				b: { UserByScreenName: { limit: 95, remaining: 94, reset: 1_700_000_000 } },
				a: {
					HomeTimeline: { limit: 500, remaining: 499, reset: 1_700_000_100 },
					"/1.1/search/typeahead.json": { limit: 180, remaining: 0, reset: 1_700_000_900 },
				},
			},
		});

		expect(rows.map((row) => `${row.profile} ${row.endpoint}`)).toEqual([
			"a /1.1/search/typeahead.json",
			"a HomeTimeline",
			"b UserByScreenName",
		]);
		expect(rows[0]).toMatchObject({ limit: 180, remaining: 0, reset: 1_700_000_900 });
	});

	it("rejects a payload without rate limits", () => {
		expect(() => rateLimitRowsOf({ status: "ok" })).toThrow();
	});
});
