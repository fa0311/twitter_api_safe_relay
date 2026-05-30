import { useEffect, useRef, useState } from "react";
import type { DebugEntry } from "./entryUtils";

const NEW_ENTRY_ANIMATION_MS = 900;

export const useNewEntryIds = (entries: DebugEntry[]) => {
	const knownIds = useRef(new Set<number>());
	const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
	const [newEntryIds, setNewEntryIds] = useState<ReadonlySet<number>>(new Set());

	useEffect(() => {
		const addedIds = entries.map((entry) => entry.id).filter((id) => !knownIds.current.has(id));
		for (const entry of entries) {
			knownIds.current.add(entry.id);
		}

		if (addedIds.length === 0) {
			return;
		}

		setNewEntryIds((current) => {
			const next = new Set(current);
			for (const id of addedIds) {
				next.add(id);
			}
			return next;
		});

		for (const id of addedIds) {
			const existingTimer = timers.current.get(id);
			if (existingTimer !== undefined) {
				clearTimeout(existingTimer);
			}

			const timer = setTimeout(() => {
				timers.current.delete(id);
				setNewEntryIds((current) => {
					if (!current.has(id)) {
						return current;
					}
					const next = new Set(current);
					next.delete(id);
					return next;
				});
			}, NEW_ENTRY_ANIMATION_MS);
			timers.current.set(id, timer);
		}
	}, [entries]);

	useEffect(
		() => () => {
			for (const timer of timers.current.values()) {
				clearTimeout(timer);
			}
			timers.current.clear();
		},
		[],
	);

	return newEntryIds;
};
