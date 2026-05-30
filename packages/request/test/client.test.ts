import { createIntegration } from "@twitter-api-safe/test-utils";
import { createTwitterClient } from "twitter-api-safe-request";
import { afterEach, describe, expect, it } from "vitest";

describe("someFunction", () => {
	const integration = createIntegration();

	afterEach(async () => integration.afterEachCall());

	it("runs graphQLFullResponse through a persistent X profile", async () => {
		const context = await integration.browser();

		const page = await context.newPage();
		const client = createTwitterClient(page);
		await client.inject();
		await page.goto("https://x.com/home");

		const result = await client.graphQLFullResponse(
			{
				queryId: "2pq8P2wfwUBo2hqukWqdIA",
				operationName: "TweetResultByRestId",
				operationType: "query",
				metadata: {
					featureSwitches: [
						"creator_subscriptions_tweet_preview_api_enabled",
						"premium_content_api_read_enabled",
						"communities_web_enable_tweet_community_results_fetch",
						"c9s_tweet_anatomy_moderator_badge_enabled",
						"responsive_web_grok_analyze_button_fetch_trends_enabled",
						"responsive_web_grok_analyze_post_followups_enabled",
						"rweb_cashtags_composer_attachment_enabled",
						"responsive_web_jetfuel_frame",
						"responsive_web_grok_share_attachment_enabled",
						"responsive_web_grok_annotations_enabled",
						"articles_preview_enabled",
						"responsive_web_edit_tweet_api_enabled",
						"graphql_is_translatable_rweb_tweet_is_translatable_enabled",
						"view_counts_everywhere_api_enabled",
						"longform_notetweets_consumption_enabled",
						"responsive_web_twitter_article_tweet_consumption_enabled",
						"content_disclosure_indicator_enabled",
						"content_disclosure_ai_generated_indicator_enabled",
						"responsive_web_grok_show_grok_translated_post",
						"responsive_web_grok_analysis_button_from_backend",
						"post_ctas_fetch_enabled",
						"rweb_cashtags_enabled",
						"freedom_of_speech_not_reach_fetch_enabled",
						"standardized_nudges_misinfo",
						"tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled",
						"longform_notetweets_rich_text_read_enabled",
						"longform_notetweets_inline_media_enabled",
						"profile_label_improvements_pcf_label_in_post_enabled",
						"responsive_web_profile_redirect_enabled",
						"rweb_tipjar_consumption_enabled",
						"verified_phone_label_enabled",
						"responsive_web_grok_image_annotation_enabled",
						"responsive_web_grok_imagine_annotation_enabled",
						"responsive_web_grok_community_note_auto_translation_is_enabled",
						"responsive_web_graphql_skip_user_profile_image_extensions_enabled",
						"responsive_web_graphql_timeline_navigation_enabled",
						"responsive_web_enhance_cards_enabled",
					],
					fieldToggles: [
						"withArticleRichContentState",
						"withArticlePlainText",
						"withArticleSummaryText",
						"withArticleVoiceOver",
						"withGrokAnalyze",
						"withDisallowedReplyControls",
						"withPayments",
						"withAuxiliaryUserLabels",
					],
				},
			},
			{
				tweetId: "1349129669258448897",
				withCommunity: false,
				includePromotedContent: false,
				withVoice: false,
			},
		);

		const text = (result as any).data.tweetResult.result.legacy.full_text;

		expect(text).toContain("Hey you …");
	}, 120_000);
});
