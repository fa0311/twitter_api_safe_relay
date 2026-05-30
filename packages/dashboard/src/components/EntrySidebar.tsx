import { useMemo } from "react";
import { statsOf } from "../entryUtils";
import { useDebugEntriesStore } from "../store";
import { useEntryFilters } from "../useEntryFilters";
import { useNewEntryIds } from "../useNewEntryIds";
import { EntryList } from "./EntryList";
import { EntryStatsBar } from "./EntryStatsBar";
import { EntryToolbar } from "./EntryToolbar";

export const EntrySidebar = () => {
	const entries = useDebugEntriesStore((s) => s.entries);
	const { filters, setFilters, visibleEntries } = useEntryFilters(entries);
	const newEntryIds = useNewEntryIds(entries);
	const stats = useMemo(() => statsOf(entries), [entries]);

	return (
		<section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] border-[#d9e0ea] border-r bg-white max-[900px]:border-r-0 max-[900px]:border-b">
			<EntryStatsBar stats={stats} />
			<EntryToolbar filters={filters} onFiltersChange={setFilters} />
			<EntryList entries={visibleEntries} newEntryIds={newEntryIds} />
		</section>
	);
};
