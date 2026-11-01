import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { DebugControl } from "./components/DebugControl.tsx";
import { DetailPane } from "./components/DetailPane.tsx";
import { EntrySidebar } from "./components/EntrySidebar.tsx";
import { RateLimitPage } from "./components/RateLimitPage.tsx";
import { useDebugEntriesStore } from "./store.ts";
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

const views = [
	{ hash: "", label: "Requests" },
	{ hash: "#rate-limits", label: "Rate limits" },
] as const;

type View = (typeof views)[number]["hash"];

const viewOf = (hash: string): View => (hash === "#rate-limits" ? hash : "");

// The page is picked by the URL hash, so it can be linked and survives a reload
const useView = () => {
	const [view, setView] = useState(() => viewOf(location.hash));
	useEffect(() => {
		const onHashChange = () => setView(viewOf(location.hash));
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);
	return view;
};

const ViewNav = ({ view }: { view: View }) => (
	<nav className="flex overflow-hidden rounded border border-[#d9e0ea] text-xs">
		{views.map((item) => (
			<a
				className={`px-3 py-1.5 ${item.hash === view ? "bg-[#17202c] text-white" : "bg-white text-[#586577] hover:bg-[#f5f7fa]"}`}
				href={item.hash || "#"}
				key={item.label}
			>
				{item.label}
			</a>
		))}
	</nav>
);

const App = () => {
	const view = useView();
	useEffect(() => useDebugEntriesStore.getState().connect(), []);

	return (
		<div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] bg-[#f5f7fa] font-sans text-[#17202c]">
			<header className="border-[#d9e0ea] border-b bg-white px-5 py-3">
				<div className="flex flex-wrap items-center gap-3">
					<div className="mr-auto">
						<div className="font-bold text-[15px]">Twitter API Debug</div>
						<div className="text-[#667386] text-xs">Captured createApp traffic and GraphQL execution</div>
					</div>
					<ViewNav view={view} />
					<DebugControl />
					<ConnectionBadge />
				</div>
			</header>

			{view === "#rate-limits" ? (
				<RateLimitPage />
			) : (
				<main className="grid min-h-0 grid-cols-[minmax(320px,420px)_minmax(0,1fr)] max-[900px]:grid-cols-1 max-[900px]:grid-rows-[minmax(280px,42dvh)_minmax(0,1fr)]">
					<EntrySidebar />
					<DetailPane />
				</main>
			)}
		</div>
	);
};

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
