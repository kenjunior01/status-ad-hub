import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Zap, Globe2, Shield } from "lucide-react";
import mascotWaving from "@/assets/mascot-waving.png";

const tips = [
  { icon: MessageCircle, key: "loading.tip1" },
  { icon: Globe2, key: "loading.tip2" },
  { icon: Shield, key: "loading.tip3" },
];

const defaultTips = [
  "Monetize seus Status do WhatsApp",
  "Conecte-se com marcas globais",
  "Pagamentos seguros e garantidos",
];

export const AnimatedLoading = () => {
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 2500);
    return () => clearInterval(tipTimer);
  }, []);

  useEffect(() => {
    const progTimer = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 15, 95));
    }, 400);
    return () => clearInterval(progTimer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-primary/5 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/10"
            style={{
              width: 60 + i * 40,
              height: 60 + i * 40,
              top: `${15 + i * 12}%`,
              left: `${10 + i * 15}%`,
            }}
            animate={{
              x: [0, 30 * (i % 2 === 0 ? 1 : -1), 0],
              y: [0, 20 * (i % 2 === 0 ? -1 : 1), 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-8">
        {/* Animated Logo */}
        <motion.div
          className="relative mx-auto w-24 h-24"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {/* Orbiting ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -inset-2 rounded-full border border-dashed border-primary/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Pulsing glow */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl"
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Icon container */}
          <div className="relative w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 overflow-hidden bg-primary/10">
            <motion.img
              src={mascotWaving}
              alt="Camaleão"
              className="w-20 h-20 object-contain"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Sparkle dots */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-primary-foreground rounded-full"
                style={{
                  top: i < 2 ? -4 : "auto",
                  bottom: i >= 2 ? -4 : "auto",
                  left: i % 2 === 0 ? -4 : "auto",
                  right: i % 2 === 1 ? -4 : "auto",
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Status<span className="text-primary">Ads</span> Connect
          </h1>
        </motion.div>

        {/* Animated tips */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-muted-foreground"
            >
              {(() => {
                const Icon = tips[tipIndex].icon;
                return (
                  <>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                    </motion.div>
                    <span className="text-sm">{defaultTips[tipIndex]}</span>
                  </>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <motion.div
          className="w-48 mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Bouncing dots */}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
