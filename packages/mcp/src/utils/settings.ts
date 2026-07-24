import { SettingsSchema } from "twitter-api-safe-relay";
import { ZodParseError } from "twitter-api-safe-relay/tools";
import z from "zod";

const PrettyPrintSchema = z.strictObject({
	enabled: z.boolean().default(true),
});

const FileLoggerSchema = z.strictObject({
	level: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
	output: z
		.strictObject({
			type: z.literal("file"),
			prettyPrint: PrettyPrintSchema.prefault({}),
			filePath: z.string().min(1, "File path is required"),
		})
		.prefault({ type: "file", filePath: "./relay.log" }),
});

export const FileSettingsSchema = SettingsSchema.extend({
	logger: FileLoggerSchema.prefault({}),
});

export type SettingsInput = z.input<typeof FileSettingsSchema>;
export type Settings = z.output<typeof FileSettingsSchema>;

export const parseSettings = (data: SettingsInput) => {
	const result = FileSettingsSchema.safeParse(data);
	if (result.success) {
		return result.data;
	}

	throw new ZodParseError("Failed to parse settings JSON", result.error);
};
