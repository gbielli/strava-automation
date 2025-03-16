// Dans app/api/webhook/route.js

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
      return NextResponse.json({ message: "Événement ignoré - pas pertinent" });
    }

    // Générer un ID unique pour cet événement
    const eventId = crypto.randomUUID();

    // Enregistrer l'événement dans la DB avec un statut initial
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        eventType: eventData.aspect_type,
        objectType: eventData.object_type,
        objectId: eventData.object_id.toString(),
        athleteId: eventData.owner_id.toString(),
        rawData: JSON.stringify(eventData),
        status: "RECEIVED", // État initial
        createdAt: new Date(),
      },
    });

    console.log(`Événement ${eventId} enregistré, démarrage du traitement...`);

    // Lancer le traitement en arrière-plan AVANT de renvoyer la réponse
    Promise.resolve().then(async () => {
      try {
        console.log(`Début du traitement de l'événement ${eventId}...`);

        // Mettre à jour le statut
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: { status: "PROCESSING" },
        });

        // Effectuer le traitement
        const result = await processActivityWebhook(eventData);

        // Mettre à jour le statut final
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: result.success ? "COMPLETED" : "FAILED",
            message: result.message,
            completedAt: new Date(),
          },
        });

        console.log(
          `Traitement terminé pour l'événement ${eventId}: ${result.message}`
        );
      } catch (error) {
        console.error(
          `Erreur lors du traitement de l'événement ${eventId}:`,
          error
        );

        // Mettre à jour le statut en cas d'erreur
        await prisma.webhookEvent.update({
          where: { id: eventId },
          data: {
            status: "FAILED",
            message: error.message,
            completedAt: new Date(),
          },
        });
      }
    });

    // Répondre immédiatement à Strava - CECI DOIT ÊTRE EN DEHORS DU PROMISE.RESOLVE()
    return NextResponse.json({
      message: "Événement reçu et traitement initié",
      eventId,
    });
  } catch (error) {
    console.error("Erreur dans le webhook POST:", error);

    // Tenter d'enregistrer l'erreur si possible
    if (eventData) {
      try {
        await prisma.webhookEvent.create({
          data: {
            id: crypto.randomUUID(),
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

    // Toujours renvoyer un succès à Strava pour éviter les retentatives
    return NextResponse.json({
      message: "Événement reçu avec des erreurs",
      error: error.message,
    });
  }
}
