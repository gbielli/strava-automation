// app/login/page.js
"use client";
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

    // Rediriger l'utilisateur vers la page d'authentification Strava
    window.location.href = authUrl;
  };

  return (
    <div className="">
      {/* <Logo /> */}
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl font-bold">
              Empower your Strava activities descriptions with no effort
            </CardTitle>
            <CardDescription>
              Automatically analyze your interval workouts and enhance their
              descriptions with detailed statistics and insightful data.
            </CardDescription>
          </CardHeader>

          <CardFooter>
            <Button
              className="w-full bg-orange-500 hover:bg-orange-600"
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
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066l-2.084 4.116z" />
                    <path d="M10.298 8.527l4.078-8.527 4.080 8.527h-2.687l-1.394-2.922-1.391 2.922h-2.686z" />
                    <path d="M0 8.527l4.080-8.527 4.078 8.527h-2.686L4.079 5.605l-1.392 2.922H0z" />
                  </svg>
                  Se connecter avec Strava
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
