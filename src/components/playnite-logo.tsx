import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PlayNiteLogo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <svg
        className="h-8 w-8 text-primary"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.34292 2.89719C5.22245 2.22341 3.82289 3.06452 3.82289 4.36491V19.6351C3.82289 20.9355 5.22245 21.7766 6.34292 21.1028L20.1659 13.4677C21.2584 12.8099 21.2584 11.1901 20.1659 10.5323L6.34292 2.89719Z"
        />
      </svg>
      <span className="font-headline text-3xl font-bold text-primary-foreground">
        PlayNite
      </span>
    </div>
  );
}
