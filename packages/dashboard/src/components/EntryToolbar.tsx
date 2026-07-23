import type { EntryFilters, SortMode } from "../entryFilters.ts";
import type { DebugEntry, MethodFilter, VersionFilter } from "../entryUtils.ts";
import { useDebugEntriesStore, useEntrySelectionStore } from "../store.ts";

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
	visibleEntries: DebugEntry[];
};

export const EntryToolbar = ({ filters, onFiltersChange, visibleEntries }: Props) => {
	const clearEntries = useDebugEntriesStore((s) => s.clearEntries);
	const clearSelectedEntry = useEntrySelectionStore((s) => s.clearSelectedEntry);

	const update = <K extends keyof EntryFilters>(key: K, value: EntryFilters[K]) =>
		onFiltersChange({ ...filters, [key]: value });
	const clearAll = () => {
		clearEntries();
		clearSelectedEntry();
	};

	const dump = () => {
		const ndjson = visibleEntries.map((entry) => JSON.stringify(entry.request)).join("\n");
		const blob = new Blob([ndjson], { type: "application/x-ndjson" });
		const url = URL.createObjectURL(blob);
		const stamp = new Date().toISOString().replace(/[:.]/g, "-");
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `requests-${stamp}.ndjson`;
		anchor.click();
		URL.revokeObjectURL(url);
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
			<label className="flex cursor-pointer select-none items-center gap-2 text-[#586577] text-xs">
				<input
					checked={filters.dedupeLatest}
					className="h-3.5 w-3.5 accent-[#2563eb]"
					type="checkbox"
					onChange={(event) => update("dedupeLatest", event.target.checked)}
				/>
				Latest only
			</label>
			<div className="grid grid-cols-2 gap-2 border-[#e7ebf1] border-t pt-3">
				<button
					className="h-9 rounded border border-[#cfd7e3] px-3 text-[#586577] text-sm hover:bg-[#f3f6fa]"
					type="button"
					onClick={clearAll}
				>
					Clear entries
				</button>
				<button
					className="inline-flex h-9 items-center justify-center gap-1.5 rounded bg-[#2563eb] px-3 font-medium text-sm text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
					disabled={visibleEntries.length === 0}
					title="Export the listed requests as .ndjson"
					type="button"
					onClick={dump}
				>
					<svg
						aria-hidden="true"
						className="h-4 w-4"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						viewBox="0 0 24 24"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
						<polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round" />
						<line strokeLinecap="round" strokeLinejoin="round" x1="12" x2="12" y1="15" y2="3" />
					</svg>
					Dump{visibleEntries.length > 0 ? ` (${visibleEntries.length})` : ""}
				</button>
			</div>
		</div>
	);
};
