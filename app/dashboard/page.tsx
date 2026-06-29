import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans px-4">
      <main className="flex flex-col items-center gap-6 text-center max-w-2xl">
        <Link
          href="/"
          className="text-zinc-600 hover:text-zinc-900 underline"
        >
          ← Retour
        </Link>
        <h1 className="text-3xl font-semibold text-zinc-900">
          Dashboard
        </h1>
        <p className="text-lg text-zinc-600">
          Bienvenue sur ton espace personnel
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full">
          <div className="p-6 bg-white rounded-lg shadow-sm border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">
              Workouts
            </h2>
            <p className="text-zinc-600">Suivi de tes séances</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border border-zinc-200">
            <h2 className="text-xl font-semibold text-zinc-900 mb-2">
              Nutrition
            </h2>
            <p className="text-zinc-600">Journal alimentaire</p>
          </div>
        </div>
      </main>
    </div>
  );
}