export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-sm text-zinc-500">squadup</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Find players. Form squads. Queue up.
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">
        Matchmaking for people, not lobbies. Set your games, roles, rank and availability, drop into
        the queue, and get grouped with players who actually fit.
      </p>
      <p className="text-sm text-zinc-500">
        Project scaffold — features land branch by branch. See the README for the roadmap.
      </p>
    </main>
  );
}
