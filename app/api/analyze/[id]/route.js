// app/api/analyze/[id]/route.js
import { analyzeActivity } from "@/lib/strava"; // Votre fonction existante d'analyse
import { getAccessToken } from "@/lib/strava-auth";
import { NextResponse } from "next/server";

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

    // Récupérer un token d'accès pour l'utilisateur connecté
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

    // Analyser l'activité (utilisez votre fonction existante)
    const result = await analyzeActivity(tokenData.access_token, activity);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur dans l'API analyze/[id]:", error);

    // Si l'erreur est liée à l'authentification, renvoyer un code 401
    if (error.message.includes("Utilisateur non connecté")) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
