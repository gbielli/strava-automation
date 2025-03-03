// components/StravaAuthButton.jsx

const StravaAuthButton = () => {
  // Construire l'URL d'autorisation Strava
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

  // URL de callback (doit être configurée dans les paramètres de l'application Strava)
  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : process.env.NEXT_PUBLIC_REDIRECT_URI ||
        "http://localhost:3000/auth/callback";

  // Générer un état aléatoire pour la sécurité
  const state = Math.random().toString(36).substring(2, 15);

  // Scopes requis
  const scope = "activity:read_all,activity:write";

  // Construire l'URL d'autorisation
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&state=${state}`;

  return (
    <a
      href={authUrl}
      className="flex items-center justify-center gap-2 px-4 py-3 font-bold text-white bg-orange-500 rounded hover:bg-orange-600 transition-colors"
    >
      {/* SVG Logo Strava */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M10 6L8 12H13.5L13 14H9L7 20H14L16.5 14H11L12 9L15 6H10Z"
          fill="white"
        />
      </svg>
      Se connecter avec Strava
    </a>
  );
};

export default StravaAuthButton;
