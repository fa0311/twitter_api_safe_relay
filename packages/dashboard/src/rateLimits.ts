import { z } from "zod";

// GET /health of the relay: the latest X rate limit per profile and endpoint (GraphQL operation name, REST path)
const healthSchema = z.looseObject({
	rateLimit: z.record(
		z.string(),
		z.record(z.string(), z.object({ limit: z.number(), remaining: z.number(), reset: z.number() })),
	),
});

export type RateLimitRow = { profile: string; endpoint: string; limit: number; remaining: number; reset: number };

export const rateLimitRowsOf = (health: unknown): RateLimitRow[] => {
	const { rateLimit } = healthSchema.parse(health);
	return Object.entries(rateLimit)
		.flatMap(([profile, endpoints]) =>
			Object.entries(endpoints).map(([endpoint, value]) => ({ profile, endpoint, ...value })),
		)
		.toSorted((a, b) => a.profile.localeCompare(b.profile) || a.endpoint.localeCompare(b.endpoint));
};

export const filterRateLimitRows = (rows: RateLimitRow[], query: string) => {
	const needle = query.trim().toLowerCase();
	return needle ? rows.filter((row) => `${row.profile} ${row.endpoint}`.toLowerCase().includes(needle)) : rows;
};
