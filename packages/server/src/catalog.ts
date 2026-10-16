import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

// requests.ndjson: one request object per line, the latest request the X web app sent for every operation
// (recorded with twitter-api-safe-dump). Served at GET /requests.ndjson and read by twitter-api-safe-mcp.
export const catalogPath = fileURLToPath(import.meta.resolve("../requests.ndjson"));

export const readCatalog = async () => {
	const text = await fs.readFile(catalogPath, "utf-8");
	return text.split("\n").filter((line) => line.trim() !== "");
};
