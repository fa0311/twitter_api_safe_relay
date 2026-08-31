import { useEffect, useState } from "react";
import { useDebugEntriesStore } from "../store.ts";

const tradeoffs = [
	{
		title: "Some APIs will stop working",
		body: "Enabling debug wraps dispatch to record every request/response. As a side effect of this instrumentation, some APIs such as login and account creation will no longer work correctly.",
	},
	{
		title: "It cannot be disabled once enabled",
		body: "The server only enables debug on the first call and provides no way to turn it off afterwards. Restarting the server is required to return to the original state.",
	},
	{
		title: "Capture starts only after enabling",
		body: "Almost all features of this dashboard are unavailable until debug is enabled. Only traffic that occurs after enabling is shown here.",
	},
];

const DebugDialog = ({ onClose }: { onClose: () => void }) => {
	const enableDebug = useDebugEntriesStore((s) => s.enableDebug);
	const debugMode = useDebugEntriesStore((s) => s.debugMode);
	const enabling = debugMode === "enabling";

	const confirm = async () => {
		await enableDebug();
		onClose();
	};

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
			<button
				aria-label="Close"
				className="absolute inset-0 h-full w-full bg-black/40"
				type="button"
				onClick={onClose}
			/>
			<div className="relative w-full max-w-lg rounded-lg border border-[#d9e0ea] bg-white shadow-xl">
				<div className="border-[#e7ebf1] border-b px-5 py-4">
					<div className="font-bold text-[15px]">Enable debug capture?</div>
					<div className="text-[#667386] text-xs">
						This dashboard needs debug mode to capture traffic, but enabling it has the following trade-offs
					</div>
				</div>

				<div className="space-y-3 px-5 py-4">
					{tradeoffs.map((item) => (
						<div className="rounded border border-[#f0d9b6] bg-[#fdf6ec] px-3 py-2.5" key={item.title}>
							<div className="font-semibold text-[#8a5a00] text-sm">⚠ {item.title}</div>
							<div className="mt-1 text-[#5c4a2e] text-xs leading-relaxed">{item.body}</div>
						</div>
					))}
				</div>

				<div className="flex justify-end gap-2 border-[#e7ebf1] border-t px-5 py-4">
					<button
						className="h-9 rounded border border-[#cfd7e3] px-4 text-sm hover:bg-[#f3f6fa]"
						type="button"
						onClick={onClose}
						disabled={enabling}
					>
						Not now
					</button>
					<button
						className="h-9 rounded bg-[#b3261e] px-4 font-medium text-sm text-white hover:bg-[#9a1f18] disabled:opacity-60"
						type="button"
						onClick={confirm}
						disabled={enabling}
					>
						{enabling ? "Enabling…" : "Enable anyway"}
					</button>
				</div>
			</div>
		</div>
	);
};

export const DebugControl = () => {
	const debugMode = useDebugEntriesStore((s) => s.debugMode);
	const debugMessage = useDebugEntriesStore((s) => s.debugMessage);
	const [open, setOpen] = useState(false);

	// Debug may already be enabled on the server. Check first, and only prompt
	// automatically if it is still off — almost nothing works until it is on.
	useEffect(() => {
		void useDebugEntriesStore
			.getState()
			.checkDebugStatus()
			.then(() => {
				if (useDebugEntriesStore.getState().debugMode === "unknown") setOpen(true);
			});
	}, []);

	if (debugMode === "enabled") {
		return (
			<div
				className="inline-flex items-center gap-2 rounded border border-[#bfe3cd] bg-[#eaf7ef] px-2.5 py-1 text-[#168a55] text-xs"
				title={debugMessage}
			>
				<span className="h-2 w-2 rounded-full bg-[#168a55]" />
				Debug enabled
			</div>
		);
	}

	return (
		<>
			<button
				className="inline-flex h-7 items-center gap-1.5 rounded bg-[#b3261e] px-2.5 font-medium text-white text-xs hover:bg-[#9a1f18] disabled:opacity-60"
				type="button"
				onClick={() => setOpen(true)}
				disabled={debugMode === "enabling"}
			>
				{debugMode === "enabling" ? "Enabling…" : "Enable debug"}
			</button>
			{debugMode === "error" && (
				<span className="text-[#b3261e] text-xs" title={debugMessage}>
					Failed to enable
				</span>
			)}
			{open && <DebugDialog onClose={() => setOpen(false)} />}
		</>
	);
};
