import { formatTime } from "../entryUtils.ts";
import type { RateLimitRow } from "../rateLimits.ts";

type Props = {
	rows: RateLimitRow[];
};

export const RateLimitPanel = ({ rows }: Props) => (
	<div className="border-[#e7ebf1] border-t">
		<div className="flex items-baseline justify-between px-3.5 py-2">
			<div className="font-bold text-sm">Rate limits</div>
			<div className="text-[#667386] text-xs">remaining / limit, reset</div>
		</div>
		{rows.length === 0 ? (
			<div className="px-3.5 pb-3 text-[#667386] text-xs">No requests through the relay yet</div>
		) : (
			<div className="max-h-56 overflow-y-auto overscroll-contain">
				<table className="w-full text-xs">
					<tbody>
						{rows.map((row) => (
							<tr className="border-[#edf0f4] border-t" key={`${row.profile} ${row.endpoint}`}>
								<td className="w-full max-w-0 truncate px-3.5 py-1.5" title={`${row.profile} ${row.endpoint}`}>
									<span className="text-[#667386]">{row.profile}</span>{" "}
									<span className="font-semibold">{row.endpoint}</span>
								</td>
								<td
									className={`whitespace-nowrap px-2 py-1.5 text-right font-mono ${row.remaining === 0 ? "text-[#b3261e]" : ""}`}
								>
									{row.remaining} / {row.limit}
								</td>
								<td className="whitespace-nowrap py-1.5 pr-3.5 text-right text-[#7a8697]">
									{formatTime(row.reset * 1000)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		)}
	</div>
);
