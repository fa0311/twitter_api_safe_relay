import { injectTwitterApi, TWITTER_MATCHES } from "twitter-api-safe-wxt";
import { defineContentScript } from "wxt/utils/define-content-script";

export default defineContentScript({
	matches: [...TWITTER_MATCHES],
	runAt: "document_start",
	async main(ctx) {
		const twitter = await injectTwitterApi(ctx);
		await twitter.waitStartup();

		await twitter.addHook("debug", (entry) => {
			const tweets = findTweet(entry.response);
			tweets.forEach((tweet) => {
				if (tweet.legacy) {
					tweet.legacy.full_text = "Hello World!";
				}
			});
			return entry;
		});
	},
});

const findTweet = (value: any): any[] => {
	if (value === null || typeof value !== "object") {
		return [];
	}

	if (!Array.isArray(value) && Object.hasOwn(value, "__typename") && value.__typename === "Tweet") {
		return [value];
	}
	return Object.values(value).flatMap(findTweet);
};
