import fs from "node:fs/promises";
import { loadSettings } from "./settings.ts";

export const loadCliSettings = async () => loadSettings(JSON.parse(await fs.readFile("./settings.json", "utf-8")));
