import { SettingsSchema } from "twitter-api-safe-relay";
import { ZodParseError } from "twitter-api-safe-relay/tools";
import z from "zod";

const McpSchema = z
	.discriminatedUnion("transport", [
		z.strictObject({
			transport: z.literal("stdio"),
		}),
		z.strictObject({
			transport: z.literal("http"),
		}),
	])
	.prefault({ transport: "http" });

export const FileSettingsSchema = SettingsSchema.extend({
	mcp: McpSchema,
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
