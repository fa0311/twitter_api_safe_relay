import type { Response } from "playwright";
import type { TwitterApiProfileClient } from "twitter-api-safe-request";

export type RateLimit = { limit: number; remaining: number; reset: number };

export const rateLimitHeaders = ["x-rate-limit-limit", "x-rate-limit-remaining", "x-rate-limit-reset"];

export const rateLimitHeadersOf = (headers: Record<string, string>) => {
	return Object.fromEntries(Object.entries(headers).filter(([name]) => rateLimitHeaders.includes(name)));
};

export const rateLimitOf = (headers: Record<string, string>): RateLimit | undefined => {
	const [limit, remaining, reset] = rateLimitHeaders.map((name) => headers[name]);
	if (limit === undefined || remaining === undefined || reset === undefined) {
		return undefined;
	}
	return { limit: Number(limit), remaining: Number(remaining), reset: Number(reset) };
};

// X limits GraphQL per operation and REST per path
export const endpointOf = (path: string) => (path.startsWith("/graphql/") ? path.split("/")[3]! : path);

export const createRateLimitStore = () => {
	const state: Record<string, Record<string, RateLimit>> = {};

	const update = (profile: string, path: string, headers: Record<string, string>) => {
		const rateLimit = rateLimitOf(headers);
		if (rateLimit) {
			const endpoints = state[profile] ?? {};
			endpoints[endpointOf(path)] = rateLimit;
			state[profile] = endpoints;
		}
	};

	return { state, update };
};

// The X web app sends to https://x.com/i/api/... and, for some REST calls, to https://api.x.com/...
const prefix = "/i/api";
const apiPathOf = (url: string) => {
	const { pathname } = new URL(url);
	return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
};

// X's client resolves to the parsed body only; the headers come from the page's response event for the same path
export const dispatchWithHeaders = async <T extends { path: string }>(client: TwitterApiProfileClient, request: T) => {
	let headers = Promise.resolve<Record<string, string>>({});
	const listener = (response: Response) => {
		if (apiPathOf(response.url()) === request.path) {
			headers = response.allHeaders();
		}
	};
	client.page.on("response", listener);
	try {
		const result = await client.dispatch(request);
		return [result, await headers] as const;
	} finally {
		client.page.off("response", listener);
	}
};
