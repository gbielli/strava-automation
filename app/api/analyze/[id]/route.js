// app/api/analyze/[id]/route.js
import {
  extractStatsFromDescription,
  generateEnhancedTitle,
  generateWorkoutDescription,
  shouldProcessActivity,
} from "@/lib/strava";
import {
  getActivityLaps,
  getStravaActivity,
  getValidAccessToken,
  updateActivityTitleAndDescription,
} from "@/lib/strava-service";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    // Récupérer l'ID de l'activité
    const activityId = params.id;

    if (!activityId) {
      return NextResponse.json(
        { success: false, message: "ID d'activité manquant" },
        { status: 400 }
      );
    }

    // Récupérer l'ID utilisateur depuis les cookies
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Utilisateur non authentifié" },
        { status: 401 }
      );
    }

    // Obtenir un token d'accès valide
    const accessToken = await getValidAccessToken(userId);

    // Récupérer les détails de l'activité
    const activity = await getStravaActivity(accessToken, activityId);

    // Vérifier si c'est un fractionné
    if (!shouldProcessActivity(activity)) {
      return NextResponse.json({
        success: true,
        message: `Activité "${activity.name}" ignorée - pas un fractionné`,
        activity: {
          ...activity,
          isIntervalWorkout: false,
          analyzed: false,
        },
        processed: false,
      });
    }

    // Récupérer les laps
    const laps = await getActivityLaps(accessToken, activityId);

    // Générer la description
    const newDescription = generateWorkoutDescription(activity, laps);

    // Extraire les statistiques de la description
    const stats = extractStatsFromDescription(newDescription);

    // Générer le nouveau titre enrichi
    const newTitle = generateEnhancedTitle(activity.name, stats);

    // Mettre à jour la description et le titre sur Strava
    await updateActivityTitleAndDescription(
      accessToken,
      activityId,
      newTitle,
      newDescription
    );

    // Renvoyer l'activité mise à jour
    return NextResponse.json({
      success: true,
      message: `Activité "${activity.name}" analysée et mise à jour avec succès`,
      activity: {
        ...activity,
        name: newTitle,
        description: newDescription,
        isIntervalWorkout: true,
        analyzed: true,
      },
      processed: true,
    });
  } catch (error) {
    console.error(`Erreur lors de l'analyse de l'activité:`, error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
