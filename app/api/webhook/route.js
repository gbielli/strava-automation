// app/api/webhook/route.js
import { NextResponse } from "next/server";
import { analyzeActivity, getAccessToken } from "@/lib/strava";

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
    const processWebhookEvent = async () => {
      try {
        const data = await request.json();

        console.log("Webhook Strava reçu:", JSON.stringify(data));

        // Vérifier que c'est un événement d'activité de type création ou mise à jour
        if (
          data.object_type === "activity" &&
          (data.aspect_type === "create" || data.aspect_type === "update")
        ) {
          // Obtenir l'ID de l'activité et de l'athlète
          const activityId = data.object_id;
          const athleteId = data.owner_id;

          console.log(
            `Événement webhook pour l'activité ${activityId} de l'athlète ${athleteId}`
          );

          // Obtenir un token d'accès
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
              `Erreur API Strava: ${
                errorData.message || activityResponse.statusText
              }`
            );
          }

          const activity = await activityResponse.json();

          // Analyser directement cette activité spécifique
          const result = await analyzeActivity(
            tokenData.access_token,
            activity
          );

          console.log(
            `Analyse de l'activité ${activityId} via webhook terminée:`,
            result.processed ? "Traitée" : "Ignorée (pas un fractionné)"
          );
        } else {
          console.log(
            `Événement webhook ignoré - type: ${data.object_type}, aspect: ${data.aspect_type}`
          );
        }
      } catch (error) {
        console.error(
          "Erreur lors du traitement asynchrone du webhook:",
          error
        );
      }
    };

    // Lancer le traitement de manière asynchrone et renvoyer une réponse immédiatement
    processWebhookEvent();

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

curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=VOTRE_CLIENT_ID \
  -F client_secret=VOTRE_CLIENT_SECRET \
  -F callback_url=https://votre-domaine.vercel.app/api/webhook \
  -F verify_token=votre-token-secret