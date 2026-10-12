export type ImageShareHost = {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

/** Called directly from a click with an already prepared image file. */
export async function shareResultImage(host: ImageShareHost, data: ShareData): Promise<"shared" | "cancelled" | "unavailable" | "failed"> {
  try {
    if (!data.files?.length || !host.share || !host.canShare?.({ files: data.files })) return "unavailable";
    await host.share(data);
    return "shared";
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "cancelled" : "failed";
  }
}
