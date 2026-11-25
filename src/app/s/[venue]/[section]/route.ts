import { seatSharePage } from "@/lib/seatSharePage";

// "この席を送る" links: a small page with the seat's own title and picture for LINE / X, then on to the seat map.
export async function GET(request: Request, { params }: { params: Promise<{ venue: string; section: string }> }) {
  const { venue, section } = await params;
  const decode = (text: string) => { try { return decodeURIComponent(text); } catch { return text; } };
  const page = seatSharePage(decode(venue), decode(section), new URL(request.url).searchParams);
  if (page.status === 404) return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  if (page.status === 302) return new Response(null, { status: 302, headers: { Location: page.location, "X-Robots-Tag": "noindex" } });
  return new Response(page.html, { headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Robots-Tag": "noindex",
  } });
}
