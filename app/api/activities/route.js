// app/api/activities/route.js
import { shouldProcessActivity } from "@/lib/strava";
import { getValidAccessToken } from "@/lib/strava-service";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ne pas mettre en cache cette route

export async function GET(request) {
  try {
    // Récupérer l'ID utilisateur depuis les cookies
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer le paramètre count de l'URL (par défaut: 5)
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "5", 10);

    // Obtenir un token d'accès valide
    const accessToken = await getValidAccessToken(userId);

    // Récupérer les activités récentes de l'utilisateur
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${count}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || response.statusText}`
      );
    }

    const activities = await response.json();

    // Enrichir les données des activités avec l'information sur les fractionnés
    const processedActivities = activities.map((activity) => ({
      ...activity,
      isIntervalWorkout: shouldProcessActivity(activity),
      analyzed:
        activity.description && activity.description.includes("🏃 INTERVALLES"), // Vérification simplifiée
    }));

    return NextResponse.json({
      success: true,
      activities: processedActivities,
    });
  } catch (error) {
    console.error("Erreur dans l'API activities:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
