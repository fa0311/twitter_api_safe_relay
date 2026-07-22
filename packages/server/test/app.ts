import { createTwitterBrowser } from "twitter-api-safe-request";
import { createIntegration } from "twitter-api-safe-test-utils";
import { afterEach, describe, expect, it } from "vitest";
import createApp from "../src/app.ts";
import { launchBrowser } from "../src/utils/browser.ts";

describe("someFunction", () => {
	const integration = createIntegration();

	afterEach(async () => integration.afterEachCall());

	const createMockApp = async () => {
		const [browser, close] = await launchBrowser({
			browserType: "chromium",
			userDataDir: await integration.temp(),
			headless: true,
			executablePath: undefined,
			env: undefined,
			proxy: undefined,
			args: [],
			viewport: undefined,
			channel: undefined,
		});

		const page = await browser.newPage();
		const client = createTwitterBrowser(page);
		await client.inject();
		await client.goto("https://x.com/home");

		const app = await createApp([{ name: "mock", client }]);
		integration.cleanup(async () => {
			await close();
		});
		return app;
	};

	it("graphQL GET", async () => {
		const app = await createMockApp();
		const params = new URLSearchParams({
			variables: JSON.stringify({
				tweetId: "1349129669258448897",
				withCommunity: false,
				includePromotedContent: false,
				withVoice: false,
			}),
			features: JSON.stringify({
				creator_subscriptions_tweet_preview_api_enabled: true,
				premium_content_api_read_enabled: false,
				communities_web_enable_tweet_community_results_fetch: true,
				c9s_tweet_anatomy_moderator_badge_enabled: true,
				responsive_web_grok_analyze_button_fetch_trends_enabled: false,
				responsive_web_grok_analyze_post_followups_enabled: false,
				rweb_cashtags_composer_attachment_enabled: true,
				responsive_web_jetfuel_frame: true,
				responsive_web_grok_share_attachment_enabled: true,
				responsive_web_grok_annotations_enabled: true,
				articles_preview_enabled: true,
				responsive_web_edit_tweet_api_enabled: true,
				graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
				view_counts_everywhere_api_enabled: true,
				longform_notetweets_consumption_enabled: true,
				responsive_web_twitter_article_tweet_consumption_enabled: true,
				content_disclosure_indicator_enabled: true,
				content_disclosure_ai_generated_indicator_enabled: true,
				responsive_web_grok_show_grok_translated_post: true,
				responsive_web_grok_analysis_button_from_backend: true,
				post_ctas_fetch_enabled: false,
				rweb_cashtags_enabled: true,
				freedom_of_speech_not_reach_fetch_enabled: true,
				standardized_nudges_misinfo: true,
				tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
				longform_notetweets_rich_text_read_enabled: true,
				longform_notetweets_inline_media_enabled: false,
				profile_label_improvements_pcf_label_in_post_enabled: true,
				responsive_web_profile_redirect_enabled: false,
				rweb_tipjar_consumption_enabled: false,
				verified_phone_label_enabled: false,
				responsive_web_grok_image_annotation_enabled: true,
				responsive_web_grok_imagine_annotation_enabled: true,
				responsive_web_grok_community_note_auto_translation_is_enabled: true,
				responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
				responsive_web_graphql_timeline_navigation_enabled: true,
			}),
			fieldToggles: JSON.stringify({
				withArticleRichContentState: true,
				withArticlePlainText: false,
				withArticleSummaryText: true,
				withArticleVoiceOver: true,
				withGrokAnalyze: false,
				withDisallowedReplyControls: false,
			}),
		});

		const res = await app.request(`/i/api/graphql/uEyKTt72BfzaY84WLGC5Dw/TweetResultByRestId?${params.toString()}`, {
			method: "GET",
		});

		const result = await res.json();
		const text = (result as any).data.tweetResult.result.legacy.full_text;

		expect(text).toContain("Hey you …");
	}, 120_000);
});
