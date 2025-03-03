// app/api/auth/callback/route.js
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Récupérer les paramètres de l'URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const scope = searchParams.get("scope");

    // Vérifier les variables d'environnement
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    // Créer l'objet de résultats pour le débogage
    const debug = {
      code: code ? "Reçu" : "Manquant",
      scope: scope,
      clientId: clientId ? "Configuré" : "Manquant",
      clientSecret: clientSecret ? "Configuré" : "Manquant",
    };

    // Essayer d'échanger le code (si les variables sont définies)
    let tokenData = null;
    if (clientId && clientSecret && code) {
      try {
        const tokenResponse = await fetch(
          "https://www.strava.com/oauth/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              code: code,
              grant_type: "authorization_code",
            }).toString(),
          }
        );

        if (tokenResponse.ok) {
          tokenData = await tokenResponse.json();
          debug.tokenExchange = "Succès";
          debug.tokenType = tokenData.token_type;
        } else {
          const errorData = await tokenResponse.json();
          debug.tokenExchange = "Échec";
          debug.tokenError = errorData;
        }
      } catch (tokenError) {
        debug.tokenExchange = "Erreur";
        debug.tokenError = tokenError.message;
      }
    }

    // Afficher les informations de débogage au lieu de continuer
    return NextResponse.json({
      success: code && clientId && clientSecret,
      debug: debug,
      message: "Page de débogage du callback",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
