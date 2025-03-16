// app/api/internal/process-webhook/route.js
import prisma from "@/lib/prisma";
import { processActivityWebhook } from "@/lib/strava-service";
import { NextResponse } from "next/server";

// Configuration pour les fonctions serverless
export const dynamic = "force-dynamic";
// Si vous avez un plan Vercel payant, vous pouvez augmenter cette valeur
export const maxDuration = 60; // en secondes, si supporté par votre plan

export async function POST(request) {
  // Vérifier la sécurité
  const internalSecret = request.headers.get("X-Internal-Secret");
  const webhookId = request.headers.get("X-Webhook-ID");

  // Vérifier que la requête provient bien de notre système
  if (
    internalSecret !==
    (process.env.INTERNAL_API_SECRET || "fallback-secret-key")
  ) {
    console.error("Tentative d'accès non autorisée au processeur interne");
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!webhookId) {
    console.error("ID de webhook manquant");
    return NextResponse.json(
      { error: "ID de webhook manquant" },
      { status: 400 }
    );
  }

  try {
    console.log(`Démarrage du traitement pour l'événement ${webhookId}`);

    // Mettre à jour le statut en "PROCESSING"
    await prisma.webhookEvent.update({
      where: { id: webhookId },
      data: {
        status: "PROCESSING",
        message: "Traitement en cours...",
      },
    });

    // Récupérer les données du webhook
    const eventData = await request.json();

    // Exécuter le traitement complet
    console.log(
      `Traitement de l'activité ${eventData.object_id} pour l'athlète ${eventData.owner_id}`
    );

    try {
      // Traiter l'événement (cette fonction peut prendre du temps)
      const result = await processActivityWebhook(eventData);

      // Mettre à jour le statut final
      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: {
          status: result.success ? "COMPLETED" : "FAILED",
          message: result.message || "Traitement terminé",
          completedAt: new Date(),
        },
      });

      console.log(
        `Traitement terminé pour l'événement ${webhookId}: ${
          result.message || "Succès"
        }`
      );
      return NextResponse.json({
        success: true,
        message: result.message || "Succès",
      });
    } catch (processingError) {
      console.error(
        `Erreur lors du traitement de l'événement ${webhookId}:`,
        processingError
      );

      // Mettre à jour le statut en cas d'erreur
      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: {
          status: "FAILED",
          message: processingError.message || "Erreur inconnue",
          completedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: processingError.message || "Erreur inconnue",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(
      `Erreur générale dans le processeur pour ${webhookId}:`,
      error
    );

    // Tenter de mettre à jour le statut
    try {
      await prisma.webhookEvent.update({
        where: { id: webhookId },
        data: {
          status: "ERROR",
          message: error.message || "Erreur générale",
          completedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error(
        `Erreur lors de la mise à jour du statut pour ${webhookId}:`,
        dbError
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Erreur générale" },
      { status: 500 }
    );
  }
}
