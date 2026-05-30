import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { DetailPane } from "./components/DetailPane";
import { EntrySidebar } from "./components/EntrySidebar";
import { useDebugEntriesStore } from "./store";
import "./style.css";

const ConnectionBadge = () => {
	const connected = useDebugEntriesStore((s) => s.connected);
	return (
		<div className="inline-flex items-center gap-2 rounded border border-[#d9e0ea] px-2.5 py-1 text-[#586577] text-xs">
			<span className={`h-2 w-2 rounded-full ${connected ? "bg-[#168a55]" : "bg-[#b3261e]"}`} />
			{connected ? "Connected" : "Disconnected"}
		</div>
	);
};

const App = () => {
	useEffect(() => useDebugEntriesStore.getState().connect(), []);

	return (
		<div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-[#f5f7fa] font-sans text-[#17202c]">
			<header className="border-[#d9e0ea] border-b bg-white px-5 py-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="mr-auto">
						<div className="font-bold text-[15px]">Twitter API Debug</div>
						<div className="text-[#667386] text-xs">Captured createApp traffic and GraphQL execution</div>
					</div>
					<ConnectionBadge />
				</div>
			</header>

			<main className="grid min-h-0 grid-cols-[minmax(320px,420px)_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[minmax(280px,42dvh)_minmax(0,1fr)]">
				<EntrySidebar />
				<DetailPane />
			</main>
		</div>
	);
};

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
