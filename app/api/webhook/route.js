// app/api/webhook/route.js
import { NextResponse } from "next/server";
import { processActivityWebhook } from "@/lib/strava-service";

export const dynamic = "force-dynamic";

// Fonction pour valider le webhook lors de la création de l'abonnement
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Vérifier si c'est une requête de validation de webhook Strava
    const hubMode = searchParams.get("hub.mode");
    const hubChallenge = searchParams.get("hub.challenge");
    const hubVerifyToken = searchParams.get("hub.verify_token");

    // Si c'est bien une requête de validation
    if (hubMode === "subscribe" && hubChallenge) {
      console.log(`Validation webhook Strava avec le défi: ${hubChallenge}`);

      // Vérifier le token (à comparer avec votre WEBHOOK_VERIFY_TOKEN)
      const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;

      if (hubVerifyToken === verifyToken) {
        // Renvoyer le challenge comme demandé par Strava
        return NextResponse.json({ "hub.challenge": hubChallenge });
      } else {
        console.error(
          `Token de validation incorrect: ${hubVerifyToken} vs ${verifyToken}`
        );
        return NextResponse.json(
          { error: "Token de vérification invalide" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ message: "Webhook Strava endpoint" });
  } catch (error) {
    console.error("Erreur dans le webhook GET:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Fonction pour recevoir les notifications d'événements
export async function POST(request) {
  try {
    // Répondre rapidement pour respecter le délai de 2 secondes de Strava
    // Traiter l'événement de manière asynchrone
    const processEvent = async () => {
      try {
        const data = await request.json();
        console.log("Webhook Strava reçu:", JSON.stringify(data));

        // Traiter l'événement d'activité
        const result = await processActivityWebhook(data);

        console.log(
          "Résultat du traitement webhook:",
          result.processed
            ? `Activité traitée pour l'athlète ${result.athleteId}`
            : `Activité ignorée: ${result.message}`
        );
      } catch (error) {
        console.error(
          "Erreur lors du traitement asynchrone du webhook:",
          error
        );
      }
    };

    // Lancer le traitement de manière asynchrone et renvoyer une réponse immédiatement
    processEvent();

    // Répondre immédiatement avec un 200 OK comme exigé par Strava
    return NextResponse.json({
      message: "Événement reçu et en cours de traitement",
    });
  } catch (error) {
    console.error("Erreur dans le webhook POST:", error);
    // Toujours renvoyer 200 pour éviter les retentatives de Strava
    return NextResponse.json({
      message: "Événement reçu mais erreur lors du traitement",
    });
  }
}
