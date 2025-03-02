// app/api/analyze/[id]/route.js

import { analyzeActivity, getAccessToken } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json(
        { success: false, message: "ID d'activité manquant" },
        { status: 400 }
      );
    }

    // Récupérer un token d'accès
    const tokenData = await getAccessToken();

    // Récupérer les détails de l'activité spécifique
    const activityResponse = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!activityResponse.ok) {
      const errorData = await activityResponse.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || activityResponse.statusText}`
      );
    }

    const activity = await activityResponse.json();

    // Analyser l'activité
    const result = await analyzeActivity(tokenData.access_token, activity);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur dans l'API analyze/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
