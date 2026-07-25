import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { input, select } from "@inquirer/prompts";
import { type ParseError, parse, printParseErrorCode } from "jsonc-parser";
import { chromium, firefox, webkit } from "playwright";
import { CommandExecutionRequiredError } from "./error.ts";
import type { SettingsInput } from "./settings.ts";

type BrowserChoice = {
	type: "launch" | "system" | "manual";
	browserType: "chromium" | "firefox" | "webkit";
	channel?: "chrome";
};

const BROWSER_CHOICES: { name: string; value: BrowserChoice }[] = [
	{ name: "Chrome (System)", value: { type: "system", browserType: "chromium", channel: "chrome" } },
	{ name: "Chromium (Playwright)", value: { type: "launch", browserType: "chromium" } },
	{ name: "Firefox (Playwright)", value: { type: "launch", browserType: "firefox" } },
	{ name: "WebKit (Playwright)", value: { type: "launch", browserType: "webkit" } },
	{ name: "Chromium (Manual Input)", value: { type: "manual", browserType: "chromium" } },
];

export const loadCliSettings = async (file: string) => {
	const raw = await fs.readFile(file, "utf-8");
	const errors: ParseError[] = [];
	const data = parse(raw, errors, { allowTrailingComma: true });
	if (errors.length > 0) {
		throw new AggregateError(
			errors.map((e) => new Error(`Failed to parse ${file}: ${printParseErrorCode(e.error)} at offset ${e.offset}`)),
			`Failed to parse ${file}`,
		);
	}
	return data;
};

export const createDefaultSettings = async () => {
	const browser = await select({ message: "Select the browser to launch", choices: BROWSER_CHOICES });
	if (browser.type === "launch") {
		const installed = existsSync({ chromium, firefox, webkit }[browser.browserType].executablePath());
		if (!installed) {
			throw new CommandExecutionRequiredError(
				`The selected browser is not installed. Install it with:`,
				`pnpx playwright install --with-deps ${browser.browserType}`,
			);
		}
	}

	const executablePath = await (async () => {
		if (browser.type === "manual") {
			return await input({
				message: "Path to the browser executable",
				validate: (value) => existsSync(value) || "File not found",
			});
		}
	})();

	return {
		profiles: [
			{
				name: "user",
				browser: {
					type: "launch",
					browserType: browser.browserType,
					channel: browser.channel,
					executablePath: executablePath,
					userDataDir: "./user_data",
				},
			},
		],
	} satisfies SettingsInput;
};
