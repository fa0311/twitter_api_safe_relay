import { describe, expect, it } from "vitest";
import { detailPayloadOf, detailTabs } from "../src/components/detailPaneModel.ts";
import type { DebugEntry } from "../src/entryUtils.ts";

const entry = {
	id: 1,
	label: "me",
	method: "GET",
	path: "/2/users/me",
	receivedAt: 2_000,
	request: { method: "GET" },
	requestAt: 1_000,
	response: { data: { id: "1" } },
	searchText: "me get v2",
	version: "v2",
} as DebugEntry;

describe("detail pane model", () => {
	it("keeps the expected tab order and labels", () => {
		expect(detailTabs.map((tab) => tab.id)).toEqual(["request", "response", "javascript"]);
		expect(detailTabs.map((tab) => tab.label)).toEqual(["Request", "Response", "JavaScript"]);
	});

	it("returns the payload owned by the selected tab", () => {
		expect(detailPayloadOf(entry, "request")).toBe(entry.request);
		expect(detailPayloadOf(entry, "response")).toBe(entry.response);
		expect(detailPayloadOf(entry, "javascript")).toBeUndefined();
	});
});
