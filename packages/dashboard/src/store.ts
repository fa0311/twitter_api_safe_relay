import { create } from "zustand";
import { buildEntry, type DebugEntry } from "./entryUtils";

export type DebugMode = "unknown" | "enabling" | "enabled" | "error";

type State = {
	connected: boolean;
	entries: DebugEntry[];
	debugMode: DebugMode;
	debugMessage: string | undefined;
	clearEntries: () => void;
	connect: () => () => void;
	checkDebugStatus: () => Promise<void>;
	enableDebug: () => Promise<void>;
};

type EntrySelectionState = {
	selectedEntryId: number | undefined;
	selectEntry: (id: number) => void;
	clearSelectedEntry: () => void;
};

export const useEntrySelectionStore = create<EntrySelectionState>()((set) => ({
	selectedEntryId: undefined,
	selectEntry: (id) => set({ selectedEntryId: id }),
	clearSelectedEntry: () => set({ selectedEntryId: undefined }),
}));

export const useDebugEntriesStore = create<State>()((set, get) => {
	let nextId = 1;

	return {
		connected: false,
		entries: [],
		debugMode: "unknown",
		debugMessage: undefined,

		clearEntries: () => set({ entries: [] }),

		connect: () => {
			const source = new EventSource("/api/events");
			source.onopen = () => set({ connected: true });
			source.onerror = () => set({ connected: false });
			source.addEventListener("entry", (event) => {
				const id = nextId++;
				const entry = buildEntry(JSON.parse(event.data), id);
				set((s) => ({ entries: [...s.entries, entry] }));
			});
			return () => source.close();
		},

		checkDebugStatus: async () => {
			if (get().debugMode !== "unknown") return;
			try {
				const res = await fetch("/api/enable-debug");
				const body = (await res.json()) as { enabled: boolean };
				if (body.enabled) {
					set({ debugMode: "enabled", debugMessage: "Debug mode is already enabled" });
				}
			} catch {
				// Leave debugMode as "unknown" so the user can still choose to enable it.
			}
		},

		enableDebug: async () => {
			if (get().debugMode === "enabling" || get().debugMode === "enabled") return;
			set({ debugMode: "enabling", debugMessage: undefined });
			try {
				const res = await fetch("/api/enable-debug", { method: "POST" });
				const body = (await res.json()) as { success: boolean; message: string };
				// success=false means it was already enabled on the server, which is still a usable state.
				set({ debugMode: "enabled", debugMessage: body.message });
			} catch (error) {
				set({
					debugMode: "error",
					debugMessage: error instanceof Error ? error.message : "Failed to enable debug mode",
				});
			}
		},
	};
});
