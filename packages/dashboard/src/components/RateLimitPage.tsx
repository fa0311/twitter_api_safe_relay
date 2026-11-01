import { useState } from "react";
import { formatTime } from "../entryUtils.ts";
import { filterRateLimitRows } from "../rateLimits.ts";
import { useRateLimits } from "../useRateLimits.ts";

// The latest X rate limit per profile and endpoint, from GET /health of the relay (polled while this page is open)
export const RateLimitPage = () => {
	const rows = useRateLimits();
	const [query, setQuery] = useState("");
	const visibleRows = filterRateLimitRows(rows, query);

	return (
		<main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] bg-white">
			<div className="flex flex-wrap items-center gap-3 border-[#e7ebf1] border-b px-5 py-3">
				<div className="mr-auto">
					<div className="font-bold text-sm">Rate limits</div>
					<div className="text-[#667386] text-xs">
						The latest X rate limit per profile and endpoint, from GET /health
					</div>
				</div>
				<input
					aria-label="Search rate limits"
					className="h-9 w-72 max-w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"
					placeholder="Search profile, endpoint"
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			{visibleRows.length === 0 ? (
				<div className="px-5 py-4 text-[#667386] text-sm">
					{rows.length === 0 ? "No requests through the relay yet" : "No matching endpoints"}
				</div>
			) : (
				<div className="min-h-0 overflow-y-auto">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-[#f5f7fa] text-[#667386] text-xs">
							<tr>
								<th className="px-5 py-2 text-left font-semibold">Profile</th>
								<th className="px-3 py-2 text-left font-semibold">Endpoint</th>
								<th className="px-3 py-2 text-right font-semibold">Remaining / limit</th>
								<th className="px-5 py-2 text-right font-semibold">Reset</th>
							</tr>
						</thead>
						<tbody>
							{visibleRows.map((row) => (
								<tr className="border-[#edf0f4] border-t" key={`${row.profile} ${row.endpoint}`}>
									<td className="whitespace-nowrap px-5 py-2 text-[#667386]">{row.profile}</td>
									<td className="w-full px-3 py-2 font-semibold">{row.endpoint}</td>
									<td
										className={`whitespace-nowrap px-3 py-2 text-right font-mono ${row.remaining === 0 ? "text-[#b3261e]" : ""}`}
									>
										{row.remaining} / {row.limit}
									</td>
									<td className="whitespace-nowrap px-5 py-2 text-right text-[#7a8697]">
										{formatTime(row.reset * 1000)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</main>
	);
};
