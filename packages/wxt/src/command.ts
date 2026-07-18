import type { TwitterApiHookEntry, TwitterApiRequest } from "twitter-api-safe-inject/types";

export type Command = {
	waitStartup: () => void;
	request: (request: TwitterApiRequest) => unknown;
	runHook: (name: string, entry: TwitterApiHookEntry) => TwitterApiHookEntry | undefined;
	addHook: (name: string, priority: number) => void;
	removeHook: (name: string) => void;
};
