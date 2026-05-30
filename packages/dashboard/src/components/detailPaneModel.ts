import type { DebugEntry } from "../entryUtils";

export const detailTabs = [
	{ id: "request", label: "Request" },
	{ id: "response", label: "Response" },
	{ id: "javascript", label: "JavaScript" },
] as const;

export type DetailTab = (typeof detailTabs)[number]["id"];

export const detailPayloadOf = (selected: DebugEntry, tab: DetailTab): unknown => {
	if (tab === "request") return selected.request;
	if (tab === "response") return selected.response;
	return undefined;
};
