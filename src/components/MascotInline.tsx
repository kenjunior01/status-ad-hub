import { motion } from "framer-motion";
import mascotHappy from "@/assets/mascot-happy.png";
import mascotWaving from "@/assets/mascot-waving.png";
import mascotExcited from "@/assets/mascot-excited.png";
import mascotCool from "@/assets/mascot-cool.png";
import mascotLove from "@/assets/mascot-love.png";
import mascotThinking from "@/assets/mascot-thinking.png";
import mascotSleeping from "@/assets/mascot-sleeping.png";
import mascotSurprised from "@/assets/mascot-surprised.png";

type MascotMood = "happy" | "waving" | "excited" | "cool" | "love" | "thinking" | "sleeping" | "surprised";

const MOOD_IMAGES: Record<MascotMood, string> = {
  happy: mascotHappy,
  waving: mascotWaving,
  excited: mascotExcited,
  cool: mascotCool,
  love: mascotLove,
  thinking: mascotThinking,
  sleeping: mascotSleeping,
  surprised: mascotSurprised,
};

interface MascotInlineProps {
  mood?: MascotMood;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  message?: string;
  animate?: boolean;
  className?: string;
  showBubble?: boolean;
  bubblePosition?: "top" | "right" | "left";
}

const SIZE_MAP = {
  xs: "w-8 h-8",
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32",
};

export const MascotInline = ({
  mood = "happy",
  size = "md",
  message,
  animate = true,
  className = "",
  showBubble = true,
  bubblePosition = "right",
}: MascotInlineProps) => {
  const image = MOOD_IMAGES[mood];

  const bubblePositionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <motion.img
        src={image}
        alt="Camaleão mascote"
        className={`${SIZE_MAP[size]} object-contain drop-shadow-md`}
        initial={animate ? { scale: 0, rotate: -15 } : false}
        animate={animate ? { scale: 1, rotate: 0 } : undefined}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
      />
      {message && showBubble && (
        <motion.div
          className={`absolute ${bubblePositionClasses[bubblePosition]} bg-card border border-border rounded-xl px-3 py-1.5 shadow-lg max-w-[200px] z-10`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          <p className="text-xs text-foreground whitespace-normal">{message}</p>
          <div
            className={`absolute w-2 h-2 bg-card border-border rotate-45 ${
              bubblePosition === "right"
                ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-b"
                : bubblePosition === "left"
                ? "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-r border-t"
                : "top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-r"
            }`}
          />
        </motion.div>
      )}
    </div>
  );
};
