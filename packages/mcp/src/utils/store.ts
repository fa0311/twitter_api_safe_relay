import { randomUUID } from "node:crypto";

export const createResponseStore = (limit: number) => {
	const store = new Map<string, unknown>();

	const add = (value: unknown) => {
		const id = randomUUID().slice(0, 8);
		store.set(id, value);
		for (const key of store.keys()) {
			if (store.size <= limit) break;
			store.delete(key);
		}
		return id;
	};

	const get = (id: string) => store.get(id);

	const keys = () => [...store.keys()];

	return { add, get, keys };
};
