import { analyzeRecentActivities } from "@/lib/strava";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Ne pas mettre en cache cette route

export async function GET(request) {
  try {
    // Récupérer le paramètre count de l'URL (par défaut: 5)
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "5", 10);

    // Pour l'interface utilisateur, nous voulons toujours analyser toutes les activités (analyzeAll=true)
    const result = await analyzeRecentActivities(count, true);

    return NextResponse.json(result);
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
