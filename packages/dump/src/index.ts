import type { TwitterApiHookEntry } from "twitter-api-safe-request";
import { z } from "zod";

// Pages that make the X web app send one request per operation; the same list as
// fa0311/twitter-openapi tools/update_placeholder.py. "{me}" is the logged-in user's profile link.
export const PAGES = [
	"/home",
	"/explore",
	"/notifications",
	"/i/bookmarks",
	"/elonmusk",
	"/elonmusk/with_replies",
	"/elonmusk/highlights",
	"/elonmusk/media",
	"/elonmusk/followers",
	"/elonmusk/following",
	"/elonmusk/verified_followers",
	"/elonmusk/followers_you_follow",
	"/elonmusk/status/1349129669258448897",
	"/elonmusk/status/1349129669258448897/likes",
	"/elonmusk/status/1349129669258448897/retweets",
	"/search?q=twitter&src=typed_query",
	"/search?q=twitter&src=typed_query&f=live",
	"/i/lists/1141162794290520064",
	"/i/lists/1141162794290520064/members",
	"/i/lists/1141162794290520064/followers",
	"/i/communities/1493446837214187523",
	"/i/communities/1493446837214187523/media",
	"/i/communities/1493446837214187523/about",
	"/i/communities_explore",
	"/i/grok",
	"/i/lists",
	"/compose/post",
	"/i/connect_people",
	"/i/communitynotes",
	"/i/trends",
	"/i/communities/suggested",
	"/elonmusk/superfollows",
	"/elonmusk/lists",
	"/i/lists/search?q=test",
	"/i/communities/suggested?q=test",
	"{me}/likes",
	"{me}/lists",
];

// Page-local search boxes that only open on click: page -> aria-label of the button / placeholder of the input.
export const SEARCH_BOXES: Record<string, string> = { "/i/bookmarks": "Search Bookmarks" };

const RequestSchema = z.looseObject({
	method: z.enum(["GET", "POST"]),
	path: z.string().min(1),
	headers: z.record(z.string(), z.unknown()).optional(),
	params: z.unknown().optional(),
	data: z.unknown().optional(),
});

export type CatalogEntry = {
	name: string;
	method: "GET" | "POST";
	path: string;
	request: z.output<typeof RequestSchema>;
	response: unknown;
	requestAt: number;
};

const nameOf = (path: string) => {
	const last = new URL(path, "https://x.com").pathname.split("/").filter(Boolean).at(-1) ?? path;
	return last.replace(/\.json$/, "");
};

// One entry per method + path (the latest request wins); only content-type survives in headers.
export const collect = (entries: TwitterApiHookEntry[]): CatalogEntry[] => {
	const latest = new Map<string, CatalogEntry>();
	for (const entry of entries) {
		const parsed = RequestSchema.safeParse(entry.request);
		if (!parsed.success) {
			continue;
		}
		const { headers, ...rest } = parsed.data;
		const contentType = headers?.["content-type"];
		const request = { ...rest, headers: contentType === undefined ? {} : { "content-type": contentType } };
		const path = new URL(request.path, "https://x.com").pathname;
		if (!/^\/(graphql|1\.1|2)\//.test(path)) {
			continue; // only what the relay proxies (telemetry such as /12/measurement is not an API)
		}
		// a GraphQL operation keeps its name when its query id changes, so the id is not part of the identity
		const key = `${request.method} ${path.replace(/^\/graphql\/[^/]+\//, "/graphql/*/")}`;
		if ((latest.get(key)?.requestAt ?? -1) <= entry.requestAt) {
			latest.set(key, {
				name: nameOf(path),
				method: request.method,
				path,
				request,
				response: entry.response,
				requestAt: entry.requestAt,
			});
		}
	}
	return [...latest.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
};

export const toNdjson = (entries: CatalogEntry[]) =>
	entries.map((entry) => `${JSON.stringify(entry.request)}\n`).join("");

// Lines of an existing requests.ndjson, so that operations not seen in this run are kept (a run that saw them wins).
export const fromNdjson = (text: string): TwitterApiHookEntry[] =>
	text
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => ({ request: JSON.parse(line) as unknown, response: undefined, requestAt: 0, receivedAt: 0 }));
