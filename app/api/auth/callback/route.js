// app/api/auth/callback/route.js
import { exchangeCodeForToken, saveOrUpdateUser } from "@/lib/strava-service";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    // Récupérer le code d'autorisation Strava
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Gérer les erreurs d'autorisation
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?auth_error=${encodeURIComponent(
          error
        )}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/?auth_error=${encodeURIComponent(
          "Code d'autorisation manquant"
        )}`
      );
    }

    // Échanger le code contre des tokens
    const tokenData = await exchangeCodeForToken(code);

    // Sauvegarder ou mettre à jour l'utilisateur
    const user = await saveOrUpdateUser(tokenData);

    // Créer une session pour l'utilisateur
    const sessionId = nanoid();

    // Stocker la session dans un cookie sécurisé
    const cookieStore = cookies();
    cookieStore.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: "/",
      sameSite: "lax",
    });

    cookieStore.set("userId", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: "/",
      sameSite: "lax",
    });

    // Rediriger vers la page d'accueil avec un message de succès
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth_success=true`
    );
  } catch (error) {
    console.error("Erreur dans le callback d'authentification:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/?auth_error=${encodeURIComponent(
        error.message
      )}`
    );
  }
}
