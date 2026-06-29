import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans">
      <main className="flex flex-col items-center gap-6 text-center px-4">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Coach AI
        </h1>
        <p className="text-lg text-zinc-600">
          Application de coaching fitness avec IA
        </p>
        <div className="flex gap-4 mt-4">
          <a
            className="px-6 py-3 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition"
            href="/dashboard"
          >
            Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}