import type { EntryStats } from "../entryUtils";

const statsList: { key: keyof EntryStats; label: string }[] = [
	{ key: "total", label: "Total" },
	{ key: "v11", label: "v1.1" },
	{ key: "v2", label: "v2" },
	{ key: "graphql", label: "graphql" },
];

type Props = {
	stats: EntryStats;
};

export const EntryStatsBar = ({ stats }: Props) => (
	<div className="grid grid-cols-4 border-[#e7ebf1] border-b text-center text-xs">
		{statsList.map(({ key, label }, index) => (
			<div className={`px-3 py-2 ${index > 0 ? "border-[#e7ebf1] border-l" : ""}`} key={key}>
				<div className="font-bold text-[15px]">{stats[key]}</div>
				<div className="text-[#667386]">{label}</div>
			</div>
		))}
	</div>
);
