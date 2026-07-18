import { resolve } from "node:path";
import { defineConfig } from "wxt";

const chromiumProfile = resolve("./../../user_data");

export default defineConfig({
	modules: ["twitter-api-safe-wxt/module"],
	manifest: {
		name: "Twitter API Safe Example",
		version: "0.0.0",
	},
	webExt: {
		chromiumArgs: ["--disable-blink-features=AutomationControlled"],
		chromiumProfile: chromiumProfile,
	},
});
