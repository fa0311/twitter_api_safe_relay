import { z } from "zod";

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

const SettingsSchema = z.strictObject({
	port: z.number().int().min(1).max(65535).default(3000),
	logLevel: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
	logPrettyPrint: z.boolean().default(true),
	profiles: z.array(ProfileSchema).min(1, "At least one profile is required"),
});

export type Settings = z.infer<typeof SettingsSchema>;

export const loadSettings = (data: unknown) => SettingsSchema.parseAsync(data);
