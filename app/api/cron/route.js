export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await analyzeRecentActivities(1);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur dans l'API CRON:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 }
    );
  }
}
