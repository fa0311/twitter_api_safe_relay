# twitter-api-safe-wxt

Minimal WXT bridge to the Twitter/X Web App API client.

```ts
// wxt.config.ts
export default defineConfig({
  modules: ["twitter-api-safe-wxt/module"],
});
```

```ts
import { injectTwitterApi, TWITTER_MATCHES } from "twitter-api-safe-wxt";

export default defineContentScript({
  matches: [...TWITTER_MATCHES],
  runAt: "document_start",
  async main(ctx) {
    const twitter = await injectTwitterApi(ctx);
    await twitter.waitStartup();

    await twitter.addHook("debug", (entry) => {
      console.log(entry.request, entry.response);
    });

    const result = await twitter.dispatch({
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      path: "/1.1/friendships/create.json",
      params: {},
      data: {
        include_profile_interstitial_type: "1",
        include_blocking: "1",
        include_blocked_by: "1",
        include_followed_by: "1",
        include_want_retweets: "1",
        include_mute_edge: "1",
        include_can_dm: "1",
        include_can_media_tag: "1",
        include_ext_is_blue_verified: "1",
        include_ext_verified_type: "1",
        include_ext_profile_image_shape: "1",
        skip_status: "1",
        user_id: "44196397",
      },
    });
    console.log(result);
  },
});
```

Each extension instance communicates through its own injected `<script>` element. Multiple extensions using this package can therefore run on the same page without mixing responses.
Hooks from multiple extensions run in priority order. Hooks with a higher priority run first.
