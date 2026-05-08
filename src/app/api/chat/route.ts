import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient, SYSTEM_PROMPT } from "@/lib/openai";
import { SAMPLE_EVENTS, getSampleSections } from "@/lib/sample-data";
import type { ChatMessage } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message: string;
      section_id?: string | null;
      event_id?: string | null;
      history?: ChatMessage[];
    };

    const { message, section_id, event_id, history = [] } = body;

    // Build context from data
    let context = "";

    if (event_id) {
      const ev = SAMPLE_EVENTS.find((e) => e.id === event_id);
      if (ev) {
        context += `\n公演: ${ev.event_name} @ ${ev.venue_name} (${ev.event_date})`;
        context += `\n集まり度: ${ev.atsumari_score}/5`;
      }
    }

    if (section_id && event_id) {
      const sections = getSampleSections(event_id);
      const section = sections.find((s) => s.id === section_id);
      if (section) {
        context += `\nセクション: ${section.name}`;
        context += `\n- FC率: ${Math.round(section.fc_rate * 100)}%`;
        context += `\n- 一般率: ${Math.round(section.general_rate * 100)}%`;
        context += `\n- アプグレ率: ${Math.round(section.upgrade_rate * 100)}%`;
        context += `\n- 復活率: ${Math.round(section.revival_rate * 100)}%`;
        context += `\n- 制作開放率: ${Math.round(section.production_rate * 100)}%`;
      }
    }

    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "sk-your-openai-api-key") {
      const fallbackResponses = [
        "報告ありがとう！ どの抽選で当たった？",
        "いいね！ 何枚で申し込んだ？",
        "なるほど〜 支払いはクレカ？コンビニ？",
        "ブロックどこだった？ 教えて〜",
        "FC歴って何年くらい？",
        "それ気になるよね。もう少し報告が集まると傾向見えてくると思う！",
      ];
      const randomResponse =
        fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return NextResponse.json({ response: randomResponse });
    }

    const openai = getOpenAIClient();

    const systemMessage = context
      ? `${SYSTEM_PROMPT}\n\n# 現在のコンテキスト${context}`
      : SYSTEM_PROMPT;

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemMessage },
      ...history.slice(-8).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.8,
      max_tokens: 200,
    });

    const response =
      completion.choices[0]?.message?.content ?? "ごめん、うまく返せなかった";

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { response: "ちょっとエラーが起きちゃった。もう一回試してみて？" },
      { status: 500 }
    );
  }
}
