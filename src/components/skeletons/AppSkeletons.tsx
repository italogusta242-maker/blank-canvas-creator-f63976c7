import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 flex flex-col animate-in fade-in duration-500 w-full max-w-lg mx-auto lg:max-w-7xl">
    {/* Header */}
    <div className="flex items-center justify-between pb-4">
      <div className="flex gap-4 items-center">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-32 rounded-md" />
      </div>
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
    {/* Hero Card */}
    <Skeleton className="h-[200px] md:h-[350px] w-full rounded-3xl" />
    {/* Grid Columns */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
      <Skeleton className="h-[300px] w-full rounded-3xl" />
      <Skeleton className="h-[300px] w-full rounded-3xl" />
    </div>
  </div>
);

export const TreinosSkeleton = () => (
  <div className="p-4 space-y-4 animate-in fade-in duration-500 w-full max-w-lg mx-auto">
    <div className="flex items-center gap-3 mb-4 pt-2">
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-6 w-40 rounded-md" />
    </div>
    <Skeleton className="h-10 w-full rounded-xl" />
    <div className="space-y-3 mt-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
    <Skeleton className="h-2 w-full rounded-full mt-6" />
  </div>
);

export const DietaSkeleton = () => (
  <div className="p-4 space-y-4 animate-in fade-in duration-500 w-full max-w-lg mx-auto">
    <div className="flex items-center gap-3 mb-4 pt-2">
      <Skeleton className="h-6 w-6 rounded" />
      <Skeleton className="h-6 w-40 rounded-md" />
    </div>
    <Skeleton className="h-[120px] w-full rounded-2xl" />
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
      ))}
    </div>
    <div className="space-y-2 mt-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  </div>
);

export const ComunidadeSkeleton = () => (
  <div className="pt-8 px-4 space-y-5 animate-in fade-in duration-500 w-full max-w-xl mx-auto">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-40 rounded-lg" />
      <Skeleton className="h-8 w-32 rounded-xl" />
    </div>
    <Skeleton className="h-[80px] w-full rounded-2xl" />
    <Skeleton className="h-[100px] w-full rounded-2xl" />
    {[1, 2].map((i) => (
      <div key={i} className="space-y-3 border border-border rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    ))}
  </div>
);

export const DesafioSkeleton = () => (
  <div className="p-4 space-y-6 animate-in fade-in duration-500 w-full max-w-4xl mx-auto">
    <Skeleton className="h-[220px] md:h-[400px] w-full rounded-2xl md:rounded-[2.5rem]" />
    <div className="flex gap-3 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 w-24 md:h-28 md:w-28 rounded-2xl shrink-0" />
      ))}
    </div>
    <Skeleton className="h-[300px] w-full rounded-2xl" />
  </div>
);

export const PerfilSkeleton = () => (
  <div className="p-4 space-y-6 animate-in fade-in duration-500 w-full max-w-lg mx-auto">
    <div className="flex flex-col items-center gap-4 pt-8">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-6 w-40 rounded-md" />
      <Skeleton className="h-4 w-32 rounded-md" />
    </div>
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  </div>
);
