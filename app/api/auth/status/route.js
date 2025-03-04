// app/api/auth/status/route.js
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const userId = cookieStore.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ isAuthenticated: false });
    }

    // Vérifier si l'utilisateur existe dans la base de données
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, stravaId: true },
    });

    if (!user) {
      return NextResponse.json({ isAuthenticated: false });
    }

    return NextResponse.json({
      isAuthenticated: true,
      user: {
        id: user.id,
        name: user.name,
        stravaId: user.stravaId,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du statut d'authentification:",
      error
    );
    return NextResponse.json(
      { success: false, message: error.message, isAuthenticated: false },
      { status: 500 }
    );
  }
}
