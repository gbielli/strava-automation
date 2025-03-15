import { processActivityWebhook } from "@/lib/strava-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Exemple de données webhook
    const testData = {
      aspect_type: "update",
      event_time: Date.now(),
      object_id: 13555225566, // ID d'une activité existante
      object_type: "activity",
      owner_id: 28774970, // ID de l'athlète
      subscription_id: 275924,
      updates: { name: "Test" },
    };

    const result = await processActivityWebhook(testData);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur de test:", error);
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
