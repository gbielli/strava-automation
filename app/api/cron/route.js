import { analyzeRecentActivities } from "@/lib/strava";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ne pas mettre en cache cette route

export async function GET() {
  try {
    const result = await analyzeRecentActivities(1, false);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur dans l'API CRON:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
