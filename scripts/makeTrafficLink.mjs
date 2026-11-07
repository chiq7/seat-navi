// Usage: node scripts/makeTrafficLink.mjs <public-url> <source> <campaign> <post-id>
const [destination, source, campaign, postId] = process.argv.slice(2);
const sources = ["x", "line", "wechat", "threads", "instagram", "facebook"];
const isTag = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value);

try {
  const url = new URL(destination);
  if (url.origin !== "https://tixrepo.com" || url.username || url.password || url.search) {
    throw new Error("クエリの付いていない https://tixrepo.com の公開URLを指定してください。");
  }
  if (!sources.includes(source) || !isTag(campaign) || !isTag(postId)) {
    throw new Error(`配布先（${sources.join(" / ")}）、キャンペーン名、投稿IDを指定してください。IDには半角英数字、ハイフン、アンダースコアが使えます。`);
  }

  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign);
  url.searchParams.set("utm_content", postId);
  console.log(url.href);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
