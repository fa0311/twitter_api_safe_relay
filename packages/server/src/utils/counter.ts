export const createCounter = () => {
	let count = 0;
	return {
		increment: () => ++count,
		getCount: () => count,
	};
};
