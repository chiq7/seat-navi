"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PostForm } from "@/components/post-form";
import { SAMPLE_EVENTS, getSampleSections } from "@/lib/sample-data";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const sectionId = params.sectionId as string;

  const [sectionName, setSectionName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sections = getSampleSections(eventId);
    const section = sections.find((s) => s.id === sectionId);
    if (section) {
      setSectionName(section.name);
    }
    setLoading(false);
  }, [eventId, sectionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-sm font-bold text-gray-900">当選席を報告する</div>
        </div>
      </header>

      <div className="px-4 pt-5">
        <PostForm
          sectionId={sectionId}
          eventId={eventId}
          sectionName={sectionName || "セクション"}
        />
      </div>
    </div>
  );
}
