// app/api/activities/route.js
import { getAccessToken } from "@/lib/strava-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ne pas mettre en cache cette route

export async function GET(request) {
  try {
    // Récupérer le paramètre count de l'URL (par défaut: 5)
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "5", 10);

    // Obtenir un token d'accès valide pour l'utilisateur connecté
    const tokenData = await getAccessToken();

    // Récupérer les activités récentes
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${count}`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Erreur API Strava: ${errorData.message || response.statusText}`
      );
    }

    const activities = await response.json();

    return NextResponse.json({
      success: true,
      activities,
    });
  } catch (error) {
    console.error("Erreur dans l'API activities:", error);

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
