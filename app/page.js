// app/page.js
// Page d'accueil avec affichage des activités récentes et possibilité d'analyse

"use client";
import ActivityCard from "@/components/ActivityCard";
import StravaAuthButton from "@/components/StravaAuthButton";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  const searchParams = useSearchParams();

  // Vérifier les messages d'authentification dans l'URL
  useEffect(() => {
    const authSuccess = searchParams.get("auth_success");
    const authError = searchParams.get("auth_error");

    if (authSuccess) {
      setAuthStatus({ type: "success", message: "Connexion Strava réussie!" });
      setIsAuthenticated(true);
      // Charger les activités automatiquement
      loadActivities();
    } else if (authError) {
      setAuthStatus({
        type: "error",
        message: `Erreur d'authentification: ${decodeURIComponent(authError)}`,
      });
    }

    // Vérifier s'il y a déjà une session active
    checkAuthStatus();
  }, [searchParams]);

  // Vérifier le statut d'authentification
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");

      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);

        if (data.isAuthenticated) {
          loadActivities();
        }
      }
    } catch (err) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        err
      );
    }
  };

  // Fonction pour charger les activités récentes
  const loadActivities = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/activities?count=5");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message || "Erreur lors de la récupération des activités"
        );
      }

      const data = await response.json();

      if (data.success) {
        setActivities(data.activities);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error("Erreur:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Analyser une activité spécifique
  const analyzeActivity = async (activityId) => {
    setAnalyzing(true);

    try {
      const response = await fetch(`/api/analyze/${activityId}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'analyse");
      }

      const data = await response.json();

      if (data.success && data.activity) {
        // Mettre à jour l'activité dans la liste
        setActivities((prevActivities) =>
          prevActivities.map((activity) =>
            activity.id === data.activity.id ? data.activity : activity
          )
        );
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      console.error("Erreur d'analyse:", err);
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Analyseur Strava
        </h1>
        <p className="text-gray-600 mb-4">
          Analyse automatiquement vos séances de fractionné et enrichit leur
          description.
        </p>

        {/* Afficher le message d'authentification */}
        {authStatus && (
          <div
            className={`p-4 mb-4 rounded ${
              authStatus.type === "success"
                ? "bg-green-50 border border-green-500"
                : "bg-red-50 border border-red-500"
            }`}
          >
            <p
              className={
                authStatus.type === "success"
                  ? "text-green-700"
                  : "text-red-700"
              }
            >
              {authStatus.message}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {isAuthenticated ? (
            <button
              onClick={loadActivities}
              disabled={loading}
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Chargement..." : "Rafraîchir les activités"}
            </button>
          ) : (
            <StravaAuthButton />
          )}
        </div>
      </header>

      {error && (
        <div className="p-4 mb-6 border border-red-500 bg-red-50 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {isAuthenticated && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Activités récentes</h2>

          {activities.length === 0 && !loading ? (
            <p>Aucune activité trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onAnalyze={() => analyzeActivity(activity.id)}
                  analyzing={analyzing}
                />
              ))}
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      )}

      {!isAuthenticated && !loading && (
        <div className="my-8 p-6 border rounded-lg bg-gray-50">
          <h2 className="text-xl font-bold mb-3">
            Commencez par vous connecter
          </h2>
          <p className="mb-4">
            Connectez-vous avec votre compte Strava pour accéder à vos activités
            récentes et analyser automatiquement vos séances de fractionné.
          </p>
          <StravaAuthButton />
        </div>
      )}
    </main>
  );
}
