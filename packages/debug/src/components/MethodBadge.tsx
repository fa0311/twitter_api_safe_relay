import { type EntryMethod, methodBadgeClass } from "../entryUtils";

export const MethodBadge = ({ method }: { method: EntryMethod }) => (
	<span className={`rounded border px-2 py-0.5 font-bold text-[11px] ${methodBadgeClass(method)}`}>{method}</span>
);
