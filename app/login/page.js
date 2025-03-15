// app/login/page.js
"use client";
import Logo from "@/components/logo";
import { StravaLogo } from "@/components/StravaLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour déclencher l'authentification Strava
  const handleStravaLogin = () => {
    setIsLoading(true);

    // Récupérer les informations nécessaires à l'authentification
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/callback`;
    const scope = "activity:read,activity:write";

    // Construire l'URL d'authentification Strava
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}`;

    // https://www.strava.com/oauth/authorize?client_id=150301&redirect_uri=https://strava-automation.vercel.app/api/auth/callback&response_type=code&scope=activity:read,activity:write

    // Rediriger l'utilisateur vers la page d'authentification Strava
    https: window.location.href = authUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* Logo avec dimensions fixes pour contrôler la hauteur */}
      <div className="mb-2 h-[60px] flex items-center justify-center">
        <div className="w-[200px] h-[60px] overflow-hidden flex items-center justify-center">
          <Logo
            width={200}
            height={24}
            viewBoxHeight={24}
            viewBoxWidth={200}
            className="text-black"
          />
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl font-bold">
            Empower your Strava activities descriptions with no effort
          </CardTitle>
          <CardDescription>
            Automatically analyze your interval workouts and enhance their
            descriptions with detailed statistics and insightful data.
          </CardDescription>
        </CardHeader>

        <CardFooter className="pt-2">
          <Button
            className="w-full bg-white text-black border border-gray-200 hover:bg-gray-100 h-12"
            onClick={handleStravaLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Connexion en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2 h-full">
                <StravaLogo width={20} height={20} />
                Se connecter avec Strava
              </span>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
