import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="mt-2 h-8 w-52" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-1 flex-1" />
        ))}
      </div>
      <div className="mt-10 space-y-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </main>
  );
}
