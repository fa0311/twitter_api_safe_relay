import { z } from "zod";
import { ZodParseError } from "./error.ts";

const MAX_TIMER_INTERVAL_MINUTES = Math.floor((2 ** 31 - 1) / 60_000);

const ViewportSchema = z.strictObject({
	width: z.number().int().positive().default(1280),
	height: z.number().int().positive().default(720),
});

const ProxySchema = z.strictObject({
	server: z.string().min(1, "Proxy server is required"),
	bypass: z.string().optional(),
	username: z.string().optional(),
	password: z.string().optional(),
});

const HomeSchema = z.strictObject({
	url: z.url().default("https://x.com/home"),
});

const LunchBrowserSchema = z.strictObject({
	type: z.literal("launch"),
	browserType: z.enum(["chromium", "firefox", "webkit"]).default("chromium"),
	channel: z.string().min(1).optional(),
	headless: z.boolean().default(false),
	viewport: ViewportSchema.optional(),
	proxy: ProxySchema.optional(),
	args: z.array(z.string()).default([]),
	executablePath: z.string().optional(),
	env: z.record(z.string(), z.string()).optional(),
	userDataDir: z.string(),
});

const CdpBrowserSchema = z.strictObject({
	type: z.literal("cdp"),
	browserType: z.enum(["chromium"]).default("chromium"),
	cdpEndpoint: z.string().min(1, "CDP endpoint is required"),
});

const ProfileSchema = z.strictObject({
	name: z.string().min(1, "Profile name is required"),
	home: HomeSchema.prefault({}),
	pageReloadIntervalMinutes: z.number().int().min(1).max(MAX_TIMER_INTERVAL_MINUTES).optional(),
	browser: z.discriminatedUnion("type", [LunchBrowserSchema, CdpBrowserSchema]),
});

const LoggerSchema = z.strictObject({
	level: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
	output: z
		.discriminatedUnion("type", [
			z.strictObject({
				type: z.literal("stdout"),
				prettyPrint: z.boolean().default(true),
			}),
			z.strictObject({
				type: z.literal("file"),
				prettyPrint: z.boolean().default(false),
				filePath: z.string().min(1, "File path is required"),
			}),
		])
		.prefault({ type: "stdout" }),
});

export const SettingsSchema = z.strictObject({
	hostname: z.string().default("localhost"),
	port: z.number().int().min(1).max(65535).default(3000),
	logger: LoggerSchema.prefault({}),
	dashboard: z.boolean().default(true),
	profiles: z.array(ProfileSchema).min(1, "At least one profile is required"),
});

export type SettingsInput = z.input<typeof SettingsSchema>;
export type Settings = z.output<typeof SettingsSchema>;

export const parseSettings = (data: SettingsInput) => {
	const result = SettingsSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}

	throw new ZodParseError("Failed to parse settings JSON", result.error);
};
