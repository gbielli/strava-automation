// Dans app/api/webhook/route.js

// Importer directement la fonction de traitement
import { processActivityWebhook } from "@/lib/strava-service";

// Après avoir enregistré l'événement en DB...

// Lancer immédiatement le traitement mais ne pas attendre sa fin
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

// Répondre immédiatement à Strava
return NextResponse.json({
  message: "Événement reçu et traitement initié",
  eventId,
});
