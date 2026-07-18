export type GraphQLRequest = {
	queryId: string;
	operationName: string;
	operationType: "query" | "mutation";
	metadata: {
		featureSwitches: string[];
		fieldToggles: string[];
	};
};

export type GraphQLOptions = {
	fieldToggles: Record<string, unknown>;
};

export type TwitterApiRequest =
	| {
			property: "dispatch";
			query: [request: unknown];
	  }
	| {
			property: "graphQL" | "graphQLFullResponse";
			query: [operation: GraphQLRequest, body: unknown, data?: unknown, options?: GraphQLOptions];
	  };

export type TwitterApiHookEntry = {
	request: unknown;
	response: unknown;
	requestAt: number;
	receivedAt: number;
};

export type TwitterApiHook = (
	entry: TwitterApiHookEntry,
	// biome-ignore lint/suspicious/noConfusingVoidType: Hooks may observe an entry without replacing it.
) => TwitterApiHookEntry | void | Promise<TwitterApiHookEntry | void>;

export type TwitterApiStartup = {
	resolve: () => void;
	promise: Promise<void>;
};

declare global {
	var elonmusk_114514_request: (request: TwitterApiRequest) => Promise<unknown>;
	var elonmusk_114514_hook: TwitterApiHook | undefined;
	var elonmusk_114514_wait_startup: TwitterApiStartup;
}
