import type { DebugEntry, MethodFilter, VersionFilter } from "./entryUtils";

export type SortMode = "newest" | "oldest" | "label" | "method";

export type EntryFilters = {
	method: MethodFilter;
	version: VersionFilter;
	query: string;
	sort: SortMode;
};

export const initialEntryFilters: EntryFilters = {
	method: "all",
	query: "",
	sort: "newest",
	version: "all",
};

export const filterAndSortEntries = (entries: DebugEntry[], filters: EntryFilters): DebugEntry[] => {
	const query = filters.query.toLowerCase();
	const filtered = entries.filter((entry) => {
		if (filters.method !== "all" && entry.method !== filters.method) return false;
		if (filters.version !== "all" && entry.version !== filters.version) return false;
		if (query && !entry.searchText.includes(query)) return false;
		return true;
	});
	return filtered.toSorted(compareBy[filters.sort]);
};

const compareBy: Record<SortMode, (a: DebugEntry, b: DebugEntry) => number> = {
	label: (a, b) => a.label.localeCompare(b.label),
	method: (a, b) => a.method.localeCompare(b.method),
	newest: (a, b) => b.receivedAt - a.receivedAt,
	oldest: (a, b) => a.receivedAt - b.receivedAt,
};
