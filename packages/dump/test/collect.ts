import { describe, expect, it } from "vitest";
import { collect, fromNdjson, toNdjson } from "../src/index.ts";

const entry = (request: unknown, requestAt: number) => ({
	request,
	response: { ok: requestAt },
	requestAt,
	receivedAt: requestAt,
});

describe("collect", () => {
	it("keeps the latest request per operation and only the content-type header", () => {
		const catalog = collect([
			entry(
				{
					method: "GET",
					path: "/graphql/abc/UserByScreenName?x=1",
					params: { variables: "{}" },
					headers: { "content-type": "application/json", "x-csrf-token": "secret" },
				},
				1,
			),
			entry(
				{
					method: "GET",
					path: "/graphql/abc/UserByScreenName",
					params: { variables: '{"screen_name":"elonmusk"}' },
					headers: { "x-csrf-token": "secret" },
				},
				2,
			),
			entry({ method: "POST", path: "/1.1/jot/client_event.json", data: {} }, 3),
			entry({ method: "PUT", path: "/nope" }, 4),
			entry({ method: "GET", path: "/12/measurement/dcm_local_id", headers: {} }, 6),
			entry("not a request", 5),
		]);
		expect(catalog.map((e) => [e.method, e.path, e.name])).toEqual([
			["POST", "/1.1/jot/client_event.json", "client_event"],
			["GET", "/graphql/abc/UserByScreenName", "UserByScreenName"],
		]);
		expect(catalog[1]?.request).toEqual({
			method: "GET",
			path: "/graphql/abc/UserByScreenName",
			params: { variables: '{"screen_name":"elonmusk"}' },
			headers: {},
			recordedAt: new Date(2).toISOString(),
		});
		expect(catalog[1]?.response).toEqual({ ok: 2 });
		expect(toNdjson(catalog).split("\n")).toHaveLength(3);
	});

	it("merges a previous catalog: recorded operations win, unseen ones are kept", () => {
		const previous = fromNdjson(
			'{"method":"GET","path":"/graphql/old/UserByScreenName","headers":{}}\n{"method":"GET","path":"/graphql/keep/Viewer","headers":{}}\n',
		);
		const catalog = collect([
			...previous,
			entry({ method: "GET", path: "/graphql/new/UserByScreenName", headers: {} }, 1),
		]);
		expect(catalog.map((e) => e.path)).toEqual(["/graphql/keep/Viewer", "/graphql/new/UserByScreenName"]);
		expect(catalog[0]?.request).not.toHaveProperty("recordedAt");
		expect(catalog[1]?.request).toHaveProperty("recordedAt", new Date(1).toISOString());
	});
});
