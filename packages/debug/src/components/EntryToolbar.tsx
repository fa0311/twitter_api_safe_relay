import type { EntryFilters, SortMode } from "../entryFilters";
import type { MethodFilter, VersionFilter } from "../entryUtils";
import { useDebugEntriesStore, useEntrySelectionStore } from "../store";

const methodOptions: { value: MethodFilter; label: string }[] = [
	{ label: "All methods", value: "all" },
	{ label: "GET only", value: "GET" },
	{ label: "POST only", value: "POST" },
];

const versionOptions: { value: VersionFilter; label: string }[] = [
	{ label: "All versions", value: "all" },
	{ label: "v1.1 only", value: "v1.1" },
	{ label: "v2 only", value: "v2" },
	{ label: "graphql only", value: "graphql" },
];

const sortOptions: { value: SortMode; label: string }[] = [
	{ label: "Newest first", value: "newest" },
	{ label: "Oldest first", value: "oldest" },
	{ label: "Label A to Z", value: "label" },
	{ label: "Method", value: "method" },
];

type Props = {
	filters: EntryFilters;
	onFiltersChange: (filters: EntryFilters) => void;
};

export const EntryToolbar = ({ filters, onFiltersChange }: Props) => {
	const clearEntries = useDebugEntriesStore((s) => s.clearEntries);
	const clearSelectedEntry = useEntrySelectionStore((s) => s.clearSelectedEntry);

	const update = <K extends keyof EntryFilters>(key: K, value: EntryFilters[K]) =>
		onFiltersChange({ ...filters, [key]: value });
	const clearAll = () => {
		clearEntries();
		clearSelectedEntry();
	};

	return (
		<div className="space-y-3 border-[#e7ebf1] border-b p-3">
			<input
				aria-label="Search entries"
				className="h-9 w-full rounded border border-[#cfd7e3] px-3 text-sm outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#dbeafe]"
				placeholder="Search path, method, version, payload"
				type="search"
				value={filters.query}
				onChange={(event) => update("query", event.target.value)}
			/>
			<div className="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1">
				<select
					aria-label="Version filter"
					className="h-9 rounded border border-[#cfd7e3] px-2 text-sm outline-none focus:border-[#2563eb]"
					value={filters.version}
					onChange={(event) => update("version", event.target.value as VersionFilter)}
				>
					{versionOptions.map(({ label, value }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				<select
					aria-label="Method filter"
					className="h-9 rounded border border-[#cfd7e3] px-2 text-sm outline-none focus:border-[#2563eb]"
					value={filters.method}
					onChange={(event) => update("method", event.target.value as MethodFilter)}
				>
					{methodOptions.map(({ label, value }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
				<select
					aria-label="Entry sort"
					className="h-9 rounded border border-[#cfd7e3] px-2 text-sm outline-none focus:border-[#2563eb]"
					value={filters.sort}
					onChange={(event) => update("sort", event.target.value as SortMode)}
				>
					{sortOptions.map(({ label, value }) => (
						<option key={value} value={value}>
							{label}
						</option>
					))}
				</select>
			</div>
			<button
				className="h-9 w-full rounded border border-[#cfd7e3] px-3 text-sm hover:bg-[#f3f6fa]"
				type="button"
				onClick={clearAll}
			>
				Clear entries
			</button>
		</div>
	);
};
