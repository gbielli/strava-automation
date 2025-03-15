// middleware.js
import { NextResponse } from "next/server";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login).*)"],
};

export function middleware(request) {
  // Récupérer le cookie userId (sans vérifier sa validité via l'API)
  const userId = request.cookies.get("userId")?.value;

  // Si l'utilisateur n'est pas connecté et tente d'accéder à une page protégée
  if (!userId) {
    // Rediriger vers la page de login
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  // Si userId existe, considérer l'utilisateur comme authentifié
  return NextResponse.next();
}
