import fs from "node:fs/promises";
import { loadSettings } from "./settings.js";

export const loadCliSettings = async () => loadSettings(JSON.parse(await fs.readFile("./settings.json", "utf-8")));
