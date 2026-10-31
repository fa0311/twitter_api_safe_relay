import { useMemo } from "react";
import { statsOf } from "../entryUtils.ts";
import { useDebugEntriesStore } from "../store.ts";
import { useEntryFilters } from "../useEntryFilters.ts";
import { useNewEntryIds } from "../useNewEntryIds.ts";
import { useRateLimits } from "../useRateLimits.ts";
import { EntryList } from "./EntryList.tsx";
import { EntryStatsBar } from "./EntryStatsBar.tsx";
import { EntryToolbar } from "./EntryToolbar.tsx";
import { RateLimitPanel } from "./RateLimitPanel.tsx";

export const EntrySidebar = () => {
	const entries = useDebugEntriesStore((s) => s.entries);
	const { filters, setFilters, visibleEntries } = useEntryFilters(entries);
	const newEntryIds = useNewEntryIds(entries);
	const stats = useMemo(() => statsOf(entries), [entries]);
	const rateLimits = useRateLimits();

	return (
		<section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] border-[#d9e0ea] border-r bg-white max-[900px]:border-r-0 max-[900px]:border-b">
			<EntryStatsBar stats={stats} />
			<EntryToolbar filters={filters} onFiltersChange={setFilters} visibleEntries={visibleEntries} />
			<EntryList entries={visibleEntries} newEntryIds={newEntryIds} />
			<RateLimitPanel rows={rateLimits} />
		</section>
	);
};
