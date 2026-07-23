import { type DebugEntry, formatTime } from "../entryUtils.ts";
import { useEntrySelectionStore } from "../store.ts";
import { MethodBadge } from "./MethodBadge.tsx";
import { VersionBadge } from "./VersionBadge.tsx";

type Props = {
	entries: DebugEntry[];
	newEntryIds: ReadonlySet<number>;
};

export const EntryList = ({ entries, newEntryIds }: Props) => {
	if (entries.length === 0) {
		return (
			<div className="overflow-y-auto overscroll-contain">
				<div className="p-5 text-[#667386] text-sm">No matching entries</div>
			</div>
		);
	}

	return (
		<div className="overflow-y-auto overscroll-contain">
			{entries.map((entry) => (
				<EntryRow entry={entry} key={entry.id} newlyAdded={newEntryIds.has(entry.id)} />
			))}
		</div>
	);
};

type EntryRowProps = {
	entry: DebugEntry;
	newlyAdded: boolean;
};

const EntryRow = ({ entry, newlyAdded }: EntryRowProps) => {
	const selected = useEntrySelectionStore((s) => s.selectedEntryId === entry.id);
	const selectEntry = useEntrySelectionStore((s) => s.selectEntry);

	return (
		<button
			aria-current={selected ? "true" : undefined}
			className={`grid w-full cursor-pointer gap-2 border-0 border-[#edf0f4] border-b px-3.5 py-3 text-left hover:bg-[#f4f8ff] ${selected ? "bg-[#edf5ff]" : ""} ${newlyAdded ? "entry-row-new" : ""}`}
			type="button"
			onClick={() => selectEntry(entry.id)}
		>
			<span className="flex min-w-0 items-center gap-2">
				<MethodBadge method={entry.method} />
				<VersionBadge version={entry.version} />
				<span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-semibold text-sm">
					{entry.label}
				</span>
				<span className="ml-auto whitespace-nowrap font-mono text-[#667386] text-[11px]">#{entry.id}</span>
			</span>
			<span className="overflow-hidden text-ellipsis whitespace-nowrap text-[#667386] text-xs">{entry.path}</span>
			<span className="text-[#7a8697] text-[11px]">{formatTime(entry.receivedAt)}</span>
		</button>
	);
};
