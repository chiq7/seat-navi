import { notFound } from "next/navigation";
import { getRequestPublicEventCatalog } from "@/lib/publicEventCatalogContext";
import { getCachedPublicEvent } from "@/lib/serverEventData";
import FanSeatPredictionClient from "./FanSeatPredictionClient";

export default async function FanSeatPredictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const catalog = await getRequestPublicEventCatalog();
  const event = catalog?.events.find(row => row.id === id) ?? (await getCachedPublicEvent(id))?.event;
  if (!event) notFound();
  return <FanSeatPredictionClient key={event.id} params={params} initialEvent={event} />;
}
