import { create } from "zustand";
import { buildEntry, type DebugEntry } from "./entryUtils";

type State = {
	connected: boolean;
	entries: DebugEntry[];
	clearEntries: () => void;
	connect: () => () => void;
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

export const useDebugEntriesStore = create<State>()((set) => {
	let nextId = 1;

	return {
		connected: false,
		entries: [],

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
	};
});
