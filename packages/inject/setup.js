// ref: https://github.com/tsukumijima/KonomiTV/blob/master/server/static/zendriver_setup.js

(async () => {
	if (globalThis.elonmusk_114514_wait_startup) {
		return;
	}
	globalThis.elonmusk_114514_wait_startup = (() => {
		let resolveStartup;
		return {
			resolve: () => {
				if (resolveStartup) {
					resolveStartup();
					resolveStartup = null;
				}
			},
			promise: new Promise((resolve) => {
				resolveStartup = resolve;
			}),
		};
	})();

	const objectMocker = async (target, name) => {
		let value = target[name];

		return await new Promise((resolve) => {
			Object.defineProperty(target, name, {
				configurable: true,
				get: () => value,
				set(nextValue) {
					value = nextValue;
					Object.defineProperty(target, name, {
						configurable: true,
						writable: true,
						value: nextValue,
					});
					resolve(nextValue);
				},
			});
		});
	};

	globalThis.elonmusk_114514_request = async ({ property, query }) => {
		console.log(`Requesting ${property} with query:`, query);
		return client[property].apply(client, query);
	};

	const chunkArray = await objectMocker(window, "webpackChunk_twitter_responsive_web");

	const originalPush = chunkArray.push;
	const client = await new Promise((resolve) => {
		chunkArray.push = (chunk) => {
			const modules = chunk[1];
			if (modules && typeof modules === "object") {
				for (const moduleId of Object.keys(modules)) {
					const originalFactory = modules[moduleId];
					modules[moduleId] = function (module, _exports, require) {
						const originalDefineExports = require.d;
						require.d = (exp, definition) => {
							for (const key in definition) {
								Object.defineProperty(exp, key, {
									enumerable: true,
									configurable: true,
									get: definition[key],
								});
							}
						};
						const result = originalFactory.apply(this, arguments);
						require.d = originalDefineExports;

						const propertyDescriptors = Object.getOwnPropertyDescriptors(module.exports);
						for (const [exportKey, _descriptor] of Object.entries(propertyDescriptors)) {
							const originalClass = module.exports[exportKey];
							if (typeof originalClass !== "function") {
								continue;
							}
							if (originalClass.prototype === undefined) {
								continue;
							}
							if (typeof originalClass.prototype.dispatch !== "function") {
								continue;
							}
							if (typeof originalClass.prototype.get !== "function") {
								continue;
							}
							if (typeof originalClass.prototype.post !== "function") {
								continue;
							}
							if (typeof originalClass.prototype.delete !== "function") {
								continue;
							}

							const constructionProxy = new Proxy(originalClass, {
								construct(target, args, newTarget) {
									const instance = Reflect.construct(target, args, newTarget);
									instance.dispatch = async (...args) => {
										const requestAt = Date.now();
										const result = await target.prototype.dispatch.apply(instance, args);
										const receivedAt = Date.now();
										if (globalThis.elonmusk_114514_hook) {
											const data = {
												request: args[0],
												response: result,
												requestAt,
												receivedAt,
											};
											return ((await globalThis.elonmusk_114514_hook(data)) ?? data).response;
										}
										return result;
									};
									resolve(instance);
									globalThis.elonmusk_114514_wait_startup.resolve();
									return instance;
								},
							});

							Object.defineProperty(module.exports, exportKey, {
								enumerable: true,
								configurable: true,
								get: () => constructionProxy,
							});
						}

						return result;
					};
				}
			}
			return originalPush(chunk);
		};
	});
	chunkArray.push = originalPush;

	console.log("Twitter API client found");
})();
