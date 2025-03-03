// app/auth/callback/route.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Gestionnaire de callback OAuth pour Strava
export async function GET(request) {
  // Récupérer le code d'autorisation et le scope depuis l'URL
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const scope = searchParams.get("scope");
  const error = searchParams.get("error");

  // Vérifier s'il y a une erreur
  if (error) {
    console.error("Erreur d'authentification Strava:", error);
    // Rediriger vers la page d'accueil avec un paramètre d'erreur
    return NextResponse.redirect(new URL(`/?auth_error=${error}`, request.url));
  }

  // Vérifier que nous avons reçu un code
  if (!code) {
    console.error("Pas de code d'autorisation reçu");
    return NextResponse.redirect(new URL("/?auth_error=no_code", request.url));
  }

  try {
    // Échanger le code contre un token d'accès
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;

    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
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
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(
        `Erreur lors de l'échange du code: ${
          errorData.message || tokenResponse.statusText
        }`
      );
    }

    const tokenData = await tokenResponse.json();

    // Stocker les tokens dans les cookies ou une base de données
    // Pour cet exemple, nous utilisons des cookies sécurisés
    const cookieStore = cookies();

    // Stocker le refresh token de façon sécurisée
    cookieStore.set("strava_refresh_token", tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90, // 90 jours
      path: "/",
    });

    // Optionnel: stocker l'ID de l'athlète pour référence
    if (tokenData.athlete && tokenData.athlete.id) {
      cookieStore.set("strava_athlete_id", tokenData.athlete.id.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 90, // 90 jours
        path: "/",
      });
    }

    // Enregistrer le refresh token dans les variables d'environnement ou la base de données
    // Note: Ceci est un exemple. Dans une application de production,
    // vous devriez stocker cela de manière plus sécurisée.
    console.log("Token d'actualisation Strava obtenu avec succès");

    // Mettre à jour la variable d'environnement STRAVA_REFRESH_TOKEN
    // Remarque: Cette approche fonctionne uniquement pour les tests de développement
    // En production, vous devriez stocker les tokens dans une base de données
    if (process.env.NODE_ENV === "development") {
      process.env.STRAVA_REFRESH_TOKEN = tokenData.refresh_token;
    }

    // Rediriger vers la page d'accueil
    return NextResponse.redirect(new URL("/?auth_success=true", request.url));
  } catch (error) {
    console.error("Erreur lors du traitement du callback OAuth:", error);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
