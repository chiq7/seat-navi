import { NextRequest } from "next/server";
import { operationsRoute } from "@/lib/seat-campaign/operationsRoute";
export const dynamic="force-dynamic";
export const GET=(request:NextRequest)=>operationsRoute(request,true);
export const POST=(request:NextRequest)=>operationsRoute(request,true);
