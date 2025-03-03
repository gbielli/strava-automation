// middleware.js
import { NextResponse } from "next/server";

// Chemins qui ne nécessitent pas d'authentification
const publicPaths = [
  "/login",
  "/api/auth/callback",
  "/api/webhook",
  "/api/cron",
];

export function middleware(request) {
  // Vérifier si le chemin est public
  const isPublicPath = publicPaths.some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`)
  );

  // Laisser passer les requêtes pour les chemins publics
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Vérifier si l'utilisateur a un cookie refresh_token
  const hasRefreshToken = request.cookies.has("strava_refresh_token");

  // Rediriger vers la page de login si non connecté
  if (!hasRefreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Utilisateur connecté, continuer normalement
  return NextResponse.next();
}

export const config = {
  // Exécuter ce middleware sur toutes les routes sauf les ressources statiques
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
