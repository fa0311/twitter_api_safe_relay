import type { DebugEntry } from "../entryUtils.ts";

export const VersionBadge = ({ version }: { version: DebugEntry["version"] }) => (
	<span className="rounded border border-[#d7dce4] bg-[#f3f5f8] px-1.5 py-0.5 font-bold text-[#536173] text-[11px]">
		{version}
	</span>
);
