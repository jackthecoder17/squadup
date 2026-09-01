import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-3 h-8 w-64" />
      <div className="mt-10 space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </main>
  );
}
