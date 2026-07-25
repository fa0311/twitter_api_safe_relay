import { z } from "zod";

export const VariablesSchema = z.record(z.string(), z.json());

export const encodeParams = (params: Record<string, unknown>) =>
	Object.fromEntries(
		Object.entries(params).map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]),
	);
