import { getStravaAuthUrl } from "@/lib/strava-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getStravaAuthUrl();

    return NextResponse.json({ url });
  } catch (error) {
    console.error(
      "Erreur lors de la génération de l'URL d'authentification:",
      error
    );
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
