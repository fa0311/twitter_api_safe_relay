type RequestMessage<T> = { id: number; args: T };

type ResponseMessage<T> = { type: "success"; id: number; value: T } | { type: "error"; id: number; error: string };

type CommandArgs<T> = T extends (...args: infer TArgs) => unknown ? TArgs : never;
type CommandResult<T> = T extends (...args: any[]) => infer TResult ? Awaited<TResult> : never;

export const createHandler = <TCommandMap>(target: EventTarget) => {
	const response = <TCommand extends keyof TCommandMap & string>(
		command: TCommand,
		handler: (
			...args: CommandArgs<TCommandMap[TCommand]>
		) => CommandResult<TCommandMap[TCommand]> | Promise<CommandResult<TCommandMap[TCommand]>>,
	) => {
		const requestEvent = `${command}:request`;
		const responseEvent = `${command}:response`;

		const listener = async (event: Event) => {
			const request = JSON.parse((event as CustomEvent<string>).detail) as RequestMessage<
				CommandArgs<TCommandMap[TCommand]>
			>;
			let response: ResponseMessage<CommandResult<TCommandMap[TCommand]>>;

			try {
				response = { type: "success", id: request.id, value: await handler(...request.args) };
			} catch (error) {
				response = { type: "error", id: request.id, error: error instanceof Error ? error.message : String(error) };
			}

			target.dispatchEvent(new CustomEvent(responseEvent, { detail: JSON.stringify(response) }));
		};

		target.addEventListener(requestEvent, listener);
		return { dispose: () => target.removeEventListener(requestEvent, listener) };
	};

	const request = <TCommand extends keyof TCommandMap & string>(command: TCommand) => {
		const requestEvent = `${command}:request`;
		const responseEvent = `${command}:response`;
		let nextId = 1;
		const pending = new Map<
			number,
			{ resolve: (value: CommandResult<TCommandMap[TCommand]>) => void; reject: (error: Error) => void }
		>();

		const listener = (event: Event) => {
			const response = JSON.parse((event as CustomEvent<string>).detail) as ResponseMessage<
				CommandResult<TCommandMap[TCommand]>
			>;
			const promise = pending.get(response.id);
			if (!promise) return;
			pending.delete(response.id);

			if (response.type === "success") promise.resolve(response.value);
			else promise.reject(new Error(response.error));
		};

		target.addEventListener(responseEvent, listener);

		const send = (...args: CommandArgs<TCommandMap[TCommand]>): Promise<CommandResult<TCommandMap[TCommand]>> =>
			new Promise((resolve, reject) => {
				const id = nextId++;
				pending.set(id, { resolve, reject });
				target.dispatchEvent(new CustomEvent(requestEvent, { detail: JSON.stringify({ id, args }) }));
			});

		const dispose = () => {
			target.removeEventListener(responseEvent, listener);
			for (const promise of pending.values()) promise.reject(new Error("Extension context invalidated"));
			pending.clear();
		};

		return { request: send, dispose };
	};

	return { response, request };
};
