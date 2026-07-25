import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { raw as jqRaw } from "jq-wasm";
import { match } from "ts-pattern";
import { randomChoice } from "twitter-api-safe-relay/tools";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";
import { z } from "zod";
import packageJson from "../package.json" with { type: "json" };
import type { Capture } from "./utils/catalog.ts";
import { encodeParams, VariablesSchema } from "./utils/parse.ts";
import { createResponseStore } from "./utils/store.ts";

type AppOptions = {
	name: string;
	client: TwitterApiProfileClient;
};

const responseStore = createResponseStore(16);

const INSTRUCTIONS = `Call Twitter/X's private web API (GraphQL + v1.1/v2 REST) through logged-in browser profiles.

Flow: list_endpoints -> get_operation -> twitter_api_request -> filter_response. Infer the operation from its name.

Rules:
- Variable keys differ per operation (a tweet id is focalTweetId in TweetDetail but tweetId in Retweeters). Copy keys from get_operation and change values only; keep every key (removing keys can cause HTTP 422) and never guess keys from another operation. Opaque recorded values (controller_data etc.) are safe to resend unchanged - except a recorded "cursor", which makes the example a page-2 request: drop it to get the first page.
- queryId / features / fieldToggles are version locks, auto-filled from the catalog. Only send variables.
- Most operations take an internal numeric id, not an @handle. Resolve first: UserByScreenName -> .data.user.result.rest_id, or "GET /1.1/search/typeahead.json" with params {"q":"<handle>","result_type":"users"} -> id_str. A nonexistent handle returns {"data":{}} with no "errors".
- HTTP 200 does not mean success: GraphQL failures are in the response body under "errors".

Reading responses (filter_response on the id from twitter_api_request - raw responses are 100 KB+):
- Tweet text and counts are in a "legacy" object; the author's @handle is in a separate "core" object. User objects split the same way: screen_name and display name in "core", follower/tweet counts in "legacy".
- Do NOT collect fields with bare ".." recursion: it also picks up pinned tweets, quoted tweets embedded in results, and @handles that merely appear in user bios. Walk the timeline entries instead - this spine works for every timeline operation, keeps those out, and preserves order:
  [.. | objects | select(.type? == "TimelineAddEntries") | .entries[] | .content | (.itemContent // .items[]?.item.itemContent)]
  Pinned tweets arrive in a separate TimelinePinEntry instruction (their entry looks like any other tweet), so the spine already excludes them - no pin filtering is needed, and none is possible at entry level.
- Tweets (append to the spine): | select(.tweet_results?) | select(.promotedMetadata == null) | .tweet_results.result | (.tweet // .) | (.legacy.retweeted_status_result.result // .) | {text: .legacy.full_text, user: (.core.user_results.result | (.core.screen_name // .legacy.screen_name)), likes: (.legacy.favorite_count // 0), at: .legacy.created_at}
  The retweeted_status_result step expands a retweet to its original (an RT's own favorite_count is 0 and its full_text is truncated yet non-null, so a // fallback on full_text can never detect it). Drop that step only if you need the retweet wrapper itself.
- Users (Followers/Following/People, append to the spine): | .user_results.result | select(. != null) | (.core.screen_name // .legacy.screen_name)
- Who-engaged lookups: Retweeters and quoted_tweet_id:<id> search work (search may undercount vs the tweet's own quote_count), but Favoriters returns an empty TimelineTerminateTimeline for tweets your profile does not own - likers are private on X, so an empty list does not mean "nobody liked it".
- promotedMetadata present = ad; keep ads out unless asked for them.
- Project scalars only (text, counts, ids) in your jq output - one object-valued field can make the output bigger than you can read. Never put two generators in one object literal ({a: (..|...), b: (..|...)}) - jq emits their cross product, which reads as phantom extra results; select one object first, then project.
- Pagination: fetch the page's items AND the next cursor in ONE filter_response call, then resend the request with the value as the "cursor" variable:
  {items: [<spine>...], cursor: first(.. | objects | select(.cursorType? == "Bottom") | .value)}
  The "count" variable is only a hint - the server picks the real page size (tweet timelines ~20, user lists 50+).
Search (SearchTimeline):
- The "product" variable picks the tab: "Top" (ranked, usually what you want), "Latest" (reverse-chronological), "People", "Media".
- "rawQuery" is the literal search box; the full advanced grammar works: from:user to:user since:YYYY-MM-DD until:YYYY-MM-DD min_faves:N min_retweets:N filter:media -filter:replies lang:ja "exact phrase" a OR b #tag
- Trending on a topic = product "Top" plus an engagement floor inside rawQuery, e.g. {"rawQuery":"AI min_faves:500 lang:ja","product":"Top"}.
- Search is fuzzy and non-deterministic: identical calls return different subsets and every operator is a hint, not a guarantee - since:/until:/min_faves all leak past their boundary, so re-check texts, counts and dates in the results yourself, and confirm anything critical with TweetResultByRestId. Known bad: adding -filter:replies to a compound query can collapse it to zero or unrelated results - drop it and filter replies yourself.
- product "Top" wraps some hits in search-conversation modules that bundle the matched tweet with reply context; the spine yields every bundled item, so filter both ways: drop items whose legacy.in_reply_to_status_id_str is set unless you want replies, and check the author - a bundled thread root has no reply marker and can belong to a different user, so even a from:X search returns other people's tweets.

Writes (create/delete tweet, follow, like, bookmark, ...):
- Confirm with the user before any side-effecting call. POST alone does not mean write: HomeTimeline is a POST read.
- Do not trust a write's response (often empty or stale) - verify with a follow-up read. A deleted or nonexistent tweet id reads back as {"data":{"tweetResult":{}}} with no "errors".
- Every twitter_api_request is a live network request (a resent POST executes the write again). To re-extract, call filter_response again on the same id - never resend the request.`;

const createMcpServer = (options: AppOptions[], catalog: Capture[]) => {
	const server = new McpServer(
		{ name: packageJson.name, version: packageJson.version },
		{ instructions: INSTRUCTIONS },
	);

	const resolveClient = (profileName?: string) => {
		if (profileName === undefined) {
			return randomChoice(options).client;
		}

		const filteredOptions = options.filter((o) => o.name === profileName);

		if (filteredOptions.length === 0) {
			const profileNames = options.map((o) => o.name);
			throw new Error(`Unknown profile: "${profileName}". Available: ${profileNames.join(", ")}`);
		}

		return randomChoice(filteredOptions).client;
	};

	server.registerTool(
		"list_profiles",
		{
			description:
				"List browser profile names. Each is a separate logged-in account; pass one as `profile` to pin a request.",
			inputSchema: {},
		},
		() => ({ content: [{ type: "text", text: options.map((o) => o.name).join("\n") }] }),
	);

	server.registerTool(
		"list_endpoints",
		{
			description:
				'All callable endpoints, one per line: GraphQL as "/graphql/<queryId>/<operationName>", REST as "METHOD <path>". Use a line verbatim as `path` in get_operation and twitter_api_request.',
			inputSchema: {},
		},
		() => {
			const lines = catalog.map((capture) =>
				match(capture)
					.with({ type: "graphql" }, ({ path }) => `/graphql/${path.queryId}/${path.operationName}`)
					.with({ type: "rest" }, ({ method, path }) => `${method} ${path}`)
					.exhaustive(),
			);
			return { content: [{ type: "text", text: [...new Set(lines)].join("\n") }] };
		},
	);

	server.registerTool(
		"get_operation",
		{
			description:
				"Recorded real example for an endpoint, in the exact shape twitter_api_request accepts. Multiple lines are multiple recorded variants.",
			inputSchema: { path: z.string().describe("A line from list_endpoints, verbatim") },
		},
		({ path }) => {
			const matches = catalog.filter((capture) => {
				return match(capture)
					.with({ type: "graphql" }, ({ path: capturePath }) => {
						return `/graphql/${capturePath.queryId}/${capturePath.operationName}` === path;
					})
					.with({ type: "rest" }, ({ method, path: capturePath }) => {
						return capturePath === path || `${method} ${capturePath}` === path;
					})
					.exhaustive();
			});

			if (matches.length === 0) {
				return { content: [{ type: "text", text: `Not in catalog: ${path}. Pick a line from list_endpoints.` }] };
			}

			const data = matches.map((capture) => {
				return match(capture)
					.with({ type: "graphql", method: "GET" }, ({ method, params }) => ({
						method,
						params: {
							variables: VariablesSchema.parse(JSON.parse(params.variables)),
						},
					}))
					.with({ type: "graphql", method: "POST" }, ({ method, data }) => ({
						method,
						data: {
							variables: VariablesSchema.parse(data.variables),
						},
					}))
					.with({ type: "rest", method: "GET" }, (capture) => capture)
					.with({ type: "rest", method: "POST" }, (capture) => capture)
					.exhaustive();
			});

			return { content: [{ type: "text", text: data.map((d) => JSON.stringify(d)).join("\n") }] };
		},
	);

	server.registerTool(
		"twitter_api_request",
		{
			description:
				"Call an endpoint and return a response id (never the body - read it with filter_response). GraphQL: send {variables: {...}} in params (GET) or data (POST). REST: copy params/data from get_operation. Paths not in the catalog are sent as-is.",
			inputSchema: {
				method: z.enum(["GET", "POST"]).default("GET").describe("Only used when `path` is not in the catalog"),
				path: z
					.string()
					.describe("A line from list_endpoints, verbatim; or a raw path relative to https://x.com/i/api"),
				params: z
					.record(z.string(), z.json())
					.default({})
					.describe("Query parameters; object values are JSON-encoded automatically"),
				data: z.record(z.string(), z.json()).optional().describe("JSON body (POST)"),
				headers: z.record(z.string(), z.string()).default({}).describe("Extra headers; rarely needed"),
				profile: z.string().optional().describe("Sending profile; random when omitted"),
			},
		},
		async (request) => {
			const template = catalog.find((capture) => {
				return match(capture)
					.with({ type: "graphql" }, ({ path }) => {
						return `/graphql/${path.queryId}/${path.operationName}` === request.path;
					})
					.with({ type: "rest" }, ({ method, path }) => {
						return path === request.path || `${method} ${path}` === request.path;
					})
					.exhaustive();
			});

			const data = match(template)
				.with({ type: "graphql", method: "GET" }, (capture) => ({
					method: capture.method,
					path: request.path,
					headers: { "content-type": "application/json", ...request.headers },
					params: { ...capture.params, ...encodeParams(request.params) },
				}))
				.with({ type: "graphql", method: "POST" }, (capture) => ({
					method: capture.method,
					path: request.path,
					headers: { "content-type": "application/json", ...request.headers },
					data: { ...capture.data, ...request.data },
				}))
				.with({ type: "rest", method: "GET" }, (capture) => ({
					method: capture.method,
					path: capture.path,
					headers: { "content-type": "application/json", ...request.headers },
					params: { ...capture.params, ...encodeParams(request.params) },
				}))
				.with({ type: "rest", method: "POST" }, (capture) => ({
					method: capture.method,
					path: capture.path,
					headers: { "content-type": "application/json", ...request.headers },
					params: { ...capture.params, ...encodeParams(request.params) },
					data: { ...capture.data, ...request.data },
				}))
				.otherwise(() => ({
					method: request.method,
					path: request.path,
					headers: request.headers,
					params: request.params,
					data: request.data,
				}));

			const result = await resolveClient(request.profile).dispatch(data);
			const id = responseStore.add(result);

			return { content: [{ type: "text", text: id }] };
		},
	);

	server.registerTool(
		"filter_response",
		{
			description:
				"Apply a jq filter to a stored response and return the result - the only way to read a twitter_api_request response. Re-call freely with different filters on the same id.",
			inputSchema: {
				id: z.string().describe("A response id returned by twitter_api_request"),
				jq: z.string().describe("jq filter applied to the stored raw response"),
			},
		},
		async ({ id, jq }) => {
			const stored = responseStore.get(id);

			if (stored === undefined) {
				return {
					content: [
						{
							type: "text",
							text: `Unknown id: ${id}. Ids expire as newer responses fill the store.`,
						},
					],
					isError: true,
				};
			}

			const filtered = await jqRaw(stored, jq, ["-c"]);
			if (filtered.exitCode !== 0) {
				return { content: [{ type: "text", text: `${filtered.stderr}\n(id:${id})` }], isError: true };
			}
			if (filtered.stdout === "" || filtered.stdout === "null" || filtered.stdout === "[]") {
				const hint = `(jq matched nothing. If you expected data: the filter path may be wrong, or the request failed - inspect via filter_response with id:${id}, e.g. check .errors or [.. | objects | select(.type?) | .type] | unique)`;
				return { content: [{ type: "text", text: `${filtered.stdout}\n${hint}` }] };
			}

			return { content: [{ type: "text", text: `${filtered.stdout}\n(id:${id})` }] };
		},
	);

	return server;
};

export default createMcpServer;
