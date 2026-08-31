import type { ProfileClientGetter } from "./profiles.ts";

export type AppOptions = {
	name: string;
	getClient: ProfileClientGetter;
};
