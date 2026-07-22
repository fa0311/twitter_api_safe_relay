import type { DebugEntry } from "../entryUtils.ts";
import { MethodBadge } from "./MethodBadge.tsx";
import { VersionBadge } from "./VersionBadge.tsx";

export const DetailHeader = ({ entry }: { entry: DebugEntry }) => {
	return (
		<div className="border-[#d9e0ea] border-b bg-white px-4 py-3">
			<div className="flex flex-wrap items-center gap-3">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<MethodBadge method={entry.method} />
						<VersionBadge version={entry.version} />
						<div className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold">{entry.label}</div>
					</div>
					<div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-[#667386] text-xs">
						{entry.path}
					</div>
				</div>
			</div>
		</div>
	);
};
