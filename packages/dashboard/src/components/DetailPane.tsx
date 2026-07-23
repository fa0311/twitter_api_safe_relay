import { useState } from "react";
import { type DebugEntry, defaultScriptOf } from "../entryUtils.ts";
import { useDebugEntriesStore, useEntrySelectionStore } from "../store.ts";
import { CodeEditor } from "./CodeEditor.tsx";
import { DetailHeader } from "./DetailHeader.tsx";
import { type DetailTab, detailPayloadOf, detailTabs } from "./detailPaneModel.ts";

export const DetailPane = () => {
	const selectedEntryId = useEntrySelectionStore((s) => s.selectedEntryId);
	const entries = useDebugEntriesStore((s) => s.entries);
	const selected = entries.find((entry) => entry.id === selectedEntryId);

	if (!selected) {
		const message = entries.length > 0 ? "Select an entry from the list." : "Waiting for captured requests.";
		return (
			<section>
				<div className="border-[#d9e0ea] border-b bg-white px-4 py-3">
					<div className="text-[#667386] text-sm">{message}</div>
				</div>
			</section>
		);
	}

	return <SelectedDetailPane entry={selected} key={selected.id} />;
};

const SelectedDetailPane = ({ entry }: { entry: DebugEntry }) => {
	const [tab, setTab] = useState<DetailTab>("request");
	const [script, onScriptChange] = useState(() => defaultScriptOf(entry));

	const text = tab === "javascript" ? script : JSON.stringify(detailPayloadOf(entry, tab), null, 2);

	const body = (() => {
		if (tab === "javascript") {
			return <CodeEditor language="javascript" readOnly={false} value={text} onChange={onScriptChange} />;
		} else {
			return <CodeEditor language="json" readOnly={true} value={text} />;
		}
	})();

	return (
		<section className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
			<DetailHeader entry={entry} />

			<div className="min-h-0 min-w-0 overflow-hidden p-4">
				<div className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
					<div className="flex min-w-0 items-start gap-2">
						<div className="flex min-w-0 flex-wrap items-center gap-2">
							{detailTabs.map(({ id, label }) => (
								<button
									className={`h-8 rounded border px-3 text-sm ${
										tab === id
											? "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]"
											: "border-[#cfd7e3] bg-white text-[#536173] hover:bg-[#f3f6fa]"
									}`}
									key={id}
									type="button"
									onClick={() => setTab(id)}
								>
									{label}
								</button>
							))}
						</div>
						<div className="ml-auto flex shrink-0 items-center gap-2">
							{tab === "javascript" ? <ExecuteButton script={script} /> : null}
							<CopyButton text={text} />
						</div>
					</div>

					{body}
				</div>
			</div>
		</section>
	);
};

const CopyButton = ({ text }: { text: string | undefined }) => {
	type CopyStatus = "idle" | "copied" | "failed";

	const copyLabelOf = (status: CopyStatus) => {
		if (status === "copied") return "Copied";
		if (status === "failed") return "Failed";
		return "Copy";
	};

	const [status, setStatus] = useState<CopyStatus>("idle");

	const copy = async () => {
		if (text === undefined) {
			return;
		}

		try {
			await navigator.clipboard.writeText(text);
			setStatus("copied");
		} catch {
			setStatus("failed");
		}
		window.setTimeout(() => {
			setStatus("idle");
		}, 1400);
	};

	return (
		<button
			aria-label="Copy"
			className="h-8 rounded border border-[#cfd7e3] px-3 text-sm text-[#536173] hover:bg-[#f3f6fa] disabled:cursor-not-allowed disabled:text-[#9aa5b3]"
			disabled={text === undefined}
			type="button"
			onClick={copy}
		>
			{copyLabelOf(status)}
		</button>
	);
};

const ExecuteButton = ({ script }: { script: string }) => {
	const [running, setRunning] = useState(false);

	const compileScript = (source: string) =>
		new Function(`"use strict";\nreturn (async () => {\n${source}\n})();`) as () => Promise<unknown>;

	const execute = async () => {
		if (running) {
			return;
		}

		setRunning(true);
		try {
			const fn = compileScript(script);
			await fn();
		} catch {
			// Script return values and errors are intentionally ignored.
		} finally {
			setRunning(false);
		}
	};

	return (
		<button
			className="h-8 rounded bg-[#14532d] px-3 font-semibold text-sm text-white hover:bg-[#166534] disabled:cursor-not-allowed disabled:bg-[#aab4c1]"
			disabled={running}
			type="button"
			onClick={execute}
		>
			{running ? "Running" : "Execute"}
		</button>
	);
};
