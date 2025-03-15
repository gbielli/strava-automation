// app/api/webhook/route.js
import { processActivityWebhook } from "@/lib/strava-service";

export const runtime = "edge";

export async function POST(request) {
  let eventData = null;
  try {
    eventData = await request.json();
    console.log("Webhook Strava reçu:", JSON.stringify(eventData, null, 2));

    // Vérifier si c'est une activité et une création/update
    if (
      eventData.object_type !== "activity" ||
      (eventData.aspect_type !== "create" && eventData.aspect_type !== "update")
    ) {
      return Response.json({ message: "Événement ignoré - pas pertinent" });
    }

    // Enregistrer l'événement dans la DB comme filet de sécurité
    // avec un statut "en cours de traitement"
    const storedEvent = await prisma.webhookEvent.create({
      data: {
        eventType: eventData.aspect_type,
        objectType: eventData.object_type,
        objectId: eventData.object_id.toString(),
        athleteId: eventData.owner_id.toString(),
        rawData: JSON.stringify(eventData),
        status: "PROCESSING", // Statut "en cours"
        createdAt: new Date(),
      },
    });

    // Traiter l'événement immédiatement de manière non-bloquante
    const processPromise = processActivityWebhook(eventData)
      .then(async (result) => {
        // Mettre à jour le statut dans la DB une fois terminé
        await prisma.webhookEvent.update({
          where: { id: storedEvent.id },
          data: {
            status: result.success ? "COMPLETED" : "FAILED",
            message: result.message,
            completedAt: new Date(),
          },
        });
        console.log(
          `Traitement terminé pour l'événement ${storedEvent.id}: ${result.message}`
        );
      })
      .catch(async (error) => {
        // Gérer les erreurs
        console.error(
          `Erreur lors du traitement de l'événement ${storedEvent.id}:`,
          error
        );
        await prisma.webhookEvent.update({
          where: { id: storedEvent.id },
          data: {
            status: "FAILED",
            message: error.message,
            completedAt: new Date(),
          },
        });
      });

    // Ne pas attendre la fin du traitement pour répondre
    return Response.json({
      message: "Événement reçu et en cours de traitement",
    });
  } catch (error) {
    console.error("Erreur dans le webhook POST:", error);

    // Si possible, enregistrer l'erreur
    if (eventData) {
      try {
        await prisma.webhookEvent.create({
          data: {
            eventType: eventData.aspect_type || "unknown",
            objectType: eventData.object_type || "unknown",
            objectId: eventData.object_id?.toString() || "unknown",
            athleteId: eventData.owner_id?.toString() || "unknown",
            rawData: JSON.stringify(eventData),
            status: "ERROR",
            message: error.message,
            createdAt: new Date(),
          },
        });
      } catch (dbError) {
        console.error("Erreur lors de l'enregistrement de l'erreur:", dbError);
      }
    }

    // Toujours renvoyer 200 pour Strava
    return Response.json({ message: "Événement reçu" });
  }
}
