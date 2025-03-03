// app/api/cron/route.js
import { analyzeRecentActivities } from "@/lib/strava";
import { getAccessToken } from "@/lib/strava-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ne pas mettre en cache cette route

export async function GET() {
  try {
    // Utiliser le token par défaut défini dans les variables d'environnement
    const tokenData = await getAccessToken(true); // true = utiliser le token par défaut

    // Analyser les activités récentes avec ce token
    const result = await analyzeRecentActivities(
      tokenData.access_token,
      1,
      false
    );

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
