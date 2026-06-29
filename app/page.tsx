import Link from "next/link"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans">
      <main className="flex flex-col items-center gap-6 text-center px-4">
        <h1 className="text-4xl font-bold text-zinc-900 mb-2">
          Coach AI
        </h1>
        <p className="text-lg text-zinc-600 max-w-md">
          Application de coaching fitness avec intelligence artificielle
        </p>
        <div className="flex gap-4 mt-8">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition font-medium"
          >
            Dashboard
          </Link>
          <Link
            href="/api/users"
            className="px-6 py-3 bg-white text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition font-medium"
          >
            API: Users
          </Link>
          <Link
            href="/api/workouts"
            className="px-6 py-3 bg-white text-zinc-900 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition font-medium"
          >
            API: Workouts
          </Link>
        </div>
        <div className="mt-12 text-sm text-zinc-500">
          Powered by Next.js 16 + Prisma + Neon
        </div>
      </main>
    </div>
  );
}