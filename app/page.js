"use client";
import ActivityCard from "@/components/ActivityCard";
import { useEffect, useState } from "react";

export default function Home() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

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

  // Charger les activités au chargement de la page
  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section / Header amélioré */}
      <header className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Empower your Strava activities descriptions with no effort
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Automatically analyze your interval workouts and enhance their
              descriptions with detailed statistics and insightful data.
            </p>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-grow bg-gray-50 p-4 md:p-8">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Analyseur Strava
                </h2>
                <p className="text-gray-600">
                  Analyse automatiquement vos séances de fractionné et enrichit
                  leur description.
                </p>
              </div>
              <button
                onClick={loadActivities}
                disabled={loading}
                className="mt-4 md:mt-0 px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-md"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    Chargement...
                  </span>
                ) : (
                  "Rafraîchir les activités"
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 mb-6 border border-red-500 bg-red-50 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6 border-b pb-2">
              Activités récentes
            </h2>

            {activities.length === 0 && !loading ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p className="text-gray-500">Aucune activité trouvée.</p>
              </div>
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
        </div>
      </main>
    </div>
  );
}
