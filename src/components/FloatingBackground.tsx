import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

// WhatsApp-inspired floating shapes that adapt to time of day
const TIME_CONFIGS = {
  aurora: {
    shapes: ["☀️", "🌅", "🌤️", "✨", "🌸"],
    colors: ["hsl(45 80% 50% / 0.12)", "hsl(152 69% 40% / 0.1)", "hsl(30 80% 55% / 0.11)"],
    particleCount: 12,
  },
  dia: {
    shapes: ["💬", "📱", "🚀", "💰", "⭐", "📊"],
    colors: ["hsl(152 69% 40% / 0.1)", "hsl(168 76% 36% / 0.08)", "hsl(142 71% 45% / 0.1)"],
    particleCount: 14,
  },
  crepusculo: {
    shapes: ["🌅", "🌇", "✨", "💫", "🌙"],
    colors: ["hsl(25 75% 42% / 0.12)", "hsl(38 92% 50% / 0.1)", "hsl(152 60% 38% / 0.08)"],
    particleCount: 10,
  },
  noite: {
    shapes: ["🌙", "⭐", "✨", "💫", "🌟"],
    colors: ["hsl(220 30% 40% / 0.1)", "hsl(200 30% 25% / 0.08)", "hsl(260 30% 40% / 0.07)"],
    particleCount: 8,
  },
};

type TimePeriod = keyof typeof TIME_CONFIGS;

const getTimePeriod = (): TimePeriod => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "aurora";
  if (hour >= 12 && hour < 17) return "dia";
  if (hour >= 17 && hour < 20) return "crepusculo";
  return "noite";
};

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  opacity: number;
}

export const FloatingBackground = () => {
  const [period, setPeriod] = useState<TimePeriod>(getTimePeriod);

  useEffect(() => {
    const interval = setInterval(() => setPeriod(getTimePeriod()), 60000);
    return () => clearInterval(interval);
  }, []);

  const config = TIME_CONFIGS[period];

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: config.particleCount }, (_, i) => ({
      id: i,
      emoji: config.shapes[i % config.shapes.length],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 18,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -20,
      driftX: (Math.random() - 0.5) * 80,
      driftY: -30 - Math.random() * 50,
      opacity: 0.25 + Math.random() * 0.3,
    }));
  }, [period, config.particleCount, config.shapes]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden" aria-hidden="true">
      {/* Gradient orbs */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-3xl"
        style={{ background: config.colors[0], top: "10%", left: "5%" }}
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-80 h-80 rounded-full blur-3xl"
        style={{ background: config.colors[1], bottom: "15%", right: "10%" }}
        animate={{ x: [0, -35, 0], y: [0, 25, 0], scale: [1.1, 0.95, 1.1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-64 h-64 rounded-full blur-3xl"
        style={{ background: config.colors[2], top: "50%", left: "50%" }}
        animate={{ x: [0, 50, -20, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating emoji particles */}
      {particles.map((p) => (
        <motion.div
          key={`${period}-${p.id}`}
          className="absolute select-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            opacity: p.opacity,
          }}
          animate={{
            y: [0, p.driftY, 0],
            x: [0, p.driftX, 0],
            rotate: [0, 360],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
};
