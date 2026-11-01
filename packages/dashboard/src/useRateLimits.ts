import { useEffect, useState } from "react";
import { type RateLimitRow, rateLimitRowsOf } from "./rateLimits.ts";

const POLL_INTERVAL_MS = 5_000;

// The relay serves the rate limits it has seen on GET /health; no debug mode needed
export const useRateLimits = () => {
	const [rows, setRows] = useState<RateLimitRow[]>([]);

	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch("/health");
				setRows(rateLimitRowsOf(await res.json()));
			} catch {
				// The relay is unreachable; the connection badge already says so.
			}
		};
		void load();
		const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
		return () => clearInterval(timer);
	}, []);

	return rows;
};
