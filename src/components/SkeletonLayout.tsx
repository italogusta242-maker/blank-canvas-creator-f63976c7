import { Skeleton } from "@/components/ui/skeleton";

const SkeletonLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-8 animate-in fade-in duration-700">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-32 rounded-full opacity-50" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
      </div>

      {/* Hero Card Skeleton */}
      <div className="relative w-full mb-10">
        <div className="rounded-[2.5rem] bg-muted/20 border border-border/50 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 h-fit md:h-[350px]">
          <div className="flex-1 space-y-6 w-full">
            <Skeleton className="h-12 md:h-16 w-3/4 rounded-2xl" />
            <Skeleton className="h-4 w-1/2 rounded-full opacity-60" />
            <Skeleton className="h-14 w-48 rounded-2xl mt-4" />
          </div>
          
          <div className="flex flex-col items-center gap-6 pr-4">
             <Skeleton className="h-48 w-48 rounded-full" />
             <div className="flex gap-6">
                <Skeleton className="h-12 w-20 rounded-xl" />
                <Skeleton className="h-12 w-20 rounded-xl" />
             </div>
          </div>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
        {/* Column 1: Daily Goals */}
        <div className="rounded-[2.5rem] bg-muted/10 border border-border/50 p-8 space-y-8">
          <Skeleton className="h-6 w-40 rounded-full mb-4" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 p-4 bg-muted/5 rounded-2xl border border-border/20">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full rounded-full" />
            </div>
          ))}
        </div>

        {/* Column 2: Performance Chart */}
        <div className="rounded-[2.5rem] bg-muted/10 border border-border/50 p-8 flex flex-col lg:col-span-1">
          <div className="flex justify-between mb-8">
             <div className="space-y-2">
                <Skeleton className="h-5 w-48 rounded-full" />
                <Skeleton className="h-3 w-32 rounded-full opacity-60" />
             </div>
             <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          <Skeleton className="flex-1 min-h-[250px] w-full rounded-2xl" />
        </div>

        {/* Column 3: Weekly Volume */}
        <div className="rounded-[2.5rem] bg-muted/10 border border-border/50 p-8 space-y-6">
           <div className="flex justify-between mb-4">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
           </div>
           <Skeleton className="h-3 w-32 rounded-full mb-6 opacity-60" />
           {[1, 2].map((i) => (
             <div key={i} className="p-4 bg-muted/5 rounded-2xl border border-border/20 space-y-4">
                <div className="flex justify-between">
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-2.5 w-32 rounded-full opacity-60" />
                   </div>
                   <Skeleton className="h-5 w-5 rounded-lg" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
             </div>
           ))}
        </div>
      </div>

      {/* Fixed Bottom Nav Skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-xl border-t border-border/50 flex items-center justify-around px-8 z-50">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-xl" />
        ))}
      </div>
    </div>
  );
};

export default SkeletonLayout;

