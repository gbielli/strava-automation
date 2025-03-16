// app/api/webhook/route.js
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    console.log(
      `Événement ${eventId} enregistré, programmation du traitement...`
    );

    // Déclencher le traitement via un appel HTTP séparé à notre endpoint interne
    // Cela permet de répondre rapidement à Strava tout en démarrant le traitement
    const internalSecret =
      process.env.INTERNAL_API_SECRET || "fallback-secret-key";

    // Utiliser fetch pour appeler notre endpoint de traitement interne
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/internal/process-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": internalSecret,
        "X-Webhook-ID": eventId,
      },
      body: JSON.stringify(eventData),
    }).catch((error) => {
      console.error(
        `Erreur lors de l'appel à l'endpoint de traitement: ${error.message}`
      );
    });

    // Répondre immédiatement à Strava
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
