import { describe, expect, it } from "vitest";
import { filterAndSortEntries, initialEntryFilters } from "../src/entryFilters.ts";
import type { DebugEntry } from "../src/entryUtils.ts";

const makeEntry = (
	overrides: Partial<DebugEntry> & Pick<DebugEntry, "id" | "label" | "method" | "receivedAt" | "searchText">,
) =>
	({
		path: "/2/users/me",
		request: {},
		requestAt: overrides.receivedAt - 10,
		response: {},
		version: "v2",
		...overrides,
	}) as DebugEntry;

const entries = [
	makeEntry({
		id: 1,
		label: "BetaLookup",
		method: "GET",
		receivedAt: 100,
		searchText: "beta lookup get v2",
	}),
	makeEntry({
		features: {},
		fieldToggles: {},
		id: 2,
		label: "AlphaMutation",
		method: "POST",
		operationName: "AlphaMutation",
		queryId: "qid-alpha",
		receivedAt: 300,
		searchText: "alpha graphql post",
		variables: {},
		version: "graphql",
	}),
	makeEntry({
		id: 3,
		label: "GammaSearch",
		method: "POST",
		receivedAt: 200,
		searchText: "gamma search v1.1",
		version: "v1.1",
	}),
];

describe("filterAndSortEntries", () => {
	it("applies method, version, and query filters together", () => {
		const result = filterAndSortEntries(entries, {
			...initialEntryFilters,
			method: "POST",
			query: "ALPHA",
			version: "graphql",
		});

		expect(result.map((entry) => entry.id)).toEqual([2]);
	});

	it("sorts by newest and oldest received time", () => {
		expect(filterAndSortEntries(entries, { ...initialEntryFilters, sort: "newest" }).map((entry) => entry.id)).toEqual([
			2, 3, 1,
		]);
		expect(filterAndSortEntries(entries, { ...initialEntryFilters, sort: "oldest" }).map((entry) => entry.id)).toEqual([
			1, 3, 2,
		]);
	});

	it("sorts by label and method without mutating the input", () => {
		const before = entries.map((entry) => entry.id);

		expect(filterAndSortEntries(entries, { ...initialEntryFilters, sort: "label" }).map((entry) => entry.id)).toEqual([
			2, 1, 3,
		]);
		expect(
			filterAndSortEntries(entries, { ...initialEntryFilters, sort: "method" }).map((entry) => entry.method),
		).toEqual(["GET", "POST", "POST"]);
		expect(entries.map((entry) => entry.id)).toEqual(before);
	});
});
