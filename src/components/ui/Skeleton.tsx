import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-on-surface/10 border-2 border-on-surface/5 shadow-brutal-sm",
        className
      )} 
    />
  );
}

export function PostSkeleton() {
  return (
    <div className="brutal-card bg-surface p-8 mb-8 border-4 border-on-surface shadow-brutal">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-12 h-12 rounded-none" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-4 w-full mb-3" />
      <Skeleton className="h-4 w-3/4 mb-6" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function EventSkeleton() {
  return (
    <div className="brutal-card bg-surface p-6 border-4 border-on-surface shadow-brutal">
      <Skeleton className="h-48 w-full mb-4" />
      <Skeleton className="h-8 w-3/4 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-1/2 mb-6" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-10" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-4 space-y-8">
          <div className="brutal-card bg-surface p-8 border-4 border-on-surface shadow-brutal">
            <Skeleton className="w-full aspect-square mb-6" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-6" />
            <div className="flex gap-2">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-12" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-12">
           <div className="brutal-card bg-surface p-8 border-4 border-on-surface shadow-brutal">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
