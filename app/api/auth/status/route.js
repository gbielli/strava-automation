// app/api/auth/status/route.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Vérifier si le refresh token est présent dans les cookies
    const cookieStore = cookies();
    const refreshToken = cookieStore.get("strava_refresh_token");

    // Alternativement, vérifier si le refresh token est dans les variables d'environnement
    const envRefreshToken = process.env.STRAVA_REFRESH_TOKEN;

    const isAuthenticated = !!refreshToken || !!envRefreshToken;

    return NextResponse.json({
      isAuthenticated,
      // N'incluez pas le token lui-même dans la réponse pour des raisons de sécurité
    });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du statut d'authentification:",
      error
    );
    return NextResponse.json(
      {
        isAuthenticated: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
