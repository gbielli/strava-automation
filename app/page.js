// app/page.js
// Page d'accueil avec affichage des activités récentes et possibilité d'analyse

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
    <main className="min-h-screen p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Analyseur Strava
        </h1>
        <p className="text-gray-600 mb-4">
          Analyse automatiquement vos séances de fractionné et enrichit leur
          description.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={loadActivities}
            disabled={loading}
            className="px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Chargement..." : "Rafraîchir les activités"}
          </button>
        </div>
      </header>

      {error && (
        <div className="p-4 mb-6 border border-red-500 bg-red-50 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

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
    </main>
  );
}
