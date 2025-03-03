// app/api/auth/callback/route.js
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Récupérer le code d'autorisation de l'URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Gérer les erreurs d'autorisation
    if (error) {
      console.error("Erreur d'autorisation Strava:", error);
      return NextResponse.redirect(
        `${request.headers.get("origin")}/login?error=${error}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${request.headers.get("origin")}/login?error=missing_code`
      );
    }

    // Échanger le code contre un token
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
      console.error("Erreur lors de l'échange de tokens:", errorData);
      return NextResponse.redirect(
        `${request.headers.get("origin")}/login?error=${encodeURIComponent(
          errorData.message || "Erreur lors de l'authentification"
        )}`
      );
    }

    // Récupérer les tokens
    const tokenData = await tokenResponse.json();

    // Stocker les tokens dans des cookies sécurisés
    cookies().set({
      name: "strava_access_token",
      value: tokenData.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenData.expires_in,
      path: "/",
    });

    cookies().set({
      name: "strava_refresh_token",
      value: tokenData.refresh_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });

    // Stocker l'ID de l'athlète pour références futures
    cookies().set({
      name: "strava_athlete_id",
      value: tokenData.athlete.id.toString(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    });

    // Rediriger vers la page d'accueil
    return NextResponse.redirect(request.headers.get("origin") || "/");
  } catch (error) {
    console.error("Erreur lors du traitement du callback:", error);
    return NextResponse.redirect(
      `${request.headers.get("origin")}/login?error=${encodeURIComponent(
        "Une erreur est survenue lors de l'authentification"
      )}`
    );
  }
}
