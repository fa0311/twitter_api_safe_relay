import { useMemo, useState } from "react";
import { type EntryFilters, filterAndSortEntries, initialEntryFilters } from "./entryFilters.ts";
import type { DebugEntry } from "./entryUtils.ts";

export const useEntryFilters = (entries: DebugEntry[]) => {
	const [filters, setFilters] = useState<EntryFilters>(initialEntryFilters);
	const visibleEntries = useMemo(() => filterAndSortEntries(entries, filters), [entries, filters]);

	return { filters, setFilters, visibleEntries };
};
