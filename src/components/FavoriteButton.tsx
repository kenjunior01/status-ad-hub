import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "overlay";
  className?: string;
}

export const FavoriteButton = ({
  isFavorite,
  onClick,
  size = "md",
  variant = "default",
  className
}: FavoriteButtonProps) => {
  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11"
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as any); }}
      className={cn(
        sizeClasses[size],
        "rounded-full transition-all duration-300 flex items-center justify-center cursor-pointer",
        variant === "overlay" 
          ? "bg-background/80 backdrop-blur-sm hover:bg-background shadow-medium"
          : "hover:bg-destructive/10",
        isFavorite && "text-destructive",
        className
      )}
    >
      <Heart 
        className={cn(
          iconSizes[size],
          "transition-all duration-300",
          isFavorite 
            ? "fill-destructive text-destructive scale-110" 
            : "text-muted-foreground hover:text-destructive"
        )} 
      />
    </div>
  );
};
