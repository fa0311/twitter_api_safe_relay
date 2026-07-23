import fs from "node:fs/promises";
import { loadSettings } from "./settings.ts";

const SAMPLE_SETTINGS = `{
	"profiles": [
		{
			"name": "account1",
			"browser": {
				"type": "launch",
				"userDataDir": "./user_data/account1"
			}
		}
	]
}`;

export const loadCliSettings = async () => {
	const raw = await fs.readFile("./settings.json", "utf-8").catch(() => {
		console.error("settings.json not found in the current working directory. Create one like:");
		console.error(SAMPLE_SETTINGS);
		return process.exit(1);
	});
	return loadSettings(JSON.parse(raw));
};
