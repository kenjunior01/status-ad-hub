import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Minimize2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// Mascot emotions — WhatsApp emoji style
type MascotMood = "happy" | "thinking" | "excited" | "waving" | "love" | "sleeping" | "cool" | "surprised";

const MOOD_EMOJIS: Record<MascotMood, { face: string; label: string }> = {
  happy:     { face: "😊", label: "Feliz" },
  thinking:  { face: "🤔", label: "Pensando" },
  excited:   { face: "🤩", label: "Animado" },
  waving:    { face: "👋", label: "Olá" },
  love:      { face: "😍", label: "Adorou" },
  sleeping:  { face: "😴", label: "Sonolento" },
  cool:      { face: "😎", label: "Tranquilo" },
  surprised: { face: "😮", label: "Surpreso" },
};

const getMoodFromContext = (isTyping: boolean, messageCount: number, hour: number): MascotMood => {
  if (isTyping) return "thinking";
  if (hour >= 0 && hour < 6) return "sleeping";
  if (messageCount === 0) return "waving";
  if (messageCount > 5) return "love";
  if (hour >= 18) return "cool";
  return "happy";
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "👋 Olá! Sou o **StatusBot**, seu assistente na plataforma StatusAds! Posso ajudar com:\n\n• Como monetizar seus Status\n• Dúvidas sobre pagamentos\n• Dicas para criadores\n• Como criar campanhas\n\nPergunta-me qualquer coisa! 🚀",
  },
];

export const StatusBotMascot = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hour = new Date().getHours();
  const mood = useMemo(
    () => getMoodFromContext(isTyping, messages.length - 1, hour),
    [isTyping, messages.length, hour]
  );
  const moodEmoji = MOOD_EMOJIS[mood];

  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: `user-${Date.now()}`, role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const { data } = await supabase.functions.invoke("statusai", {
        body: {
          type: "mascot-chat",
          message: userMsg.content,
          language: i18n.language,
          conversationHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        },
      });

      const reply = data?.response || data?.reply || "Desculpe, não consegui processar. Tente novamente!";
      setMessages((prev) => [...prev, { id: `bot-${Date.now()}`, role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `bot-${Date.now()}`, role: "assistant", content: "⚠️ Erro de conexão. Tente novamente em instantes." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Mascot Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-20 md:bottom-6 right-4 z-50"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <button
              onClick={() => { setIsOpen(true); setShowPulse(false); }}
              className="relative group"
            >
              {showPulse && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/30"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              <div className="relative w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-xl shadow-primary/30 group-hover:shadow-primary/50 transition-shadow">
                {/* Animated emoji face */}
                <motion.span
                  key={mood}
                  className="text-3xl"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  {moodEmoji.face}
                </motion.span>

                {/* Breathing animation */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary/40"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Status indicator */}
                <motion.div
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Mood tooltip */}
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card text-foreground text-xs px-2 py-1 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-border"
                initial={false}
              >
                {moodEmoji.label}
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={cn(
              "fixed z-50 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col",
              isMinimized
                ? "bottom-20 md:bottom-6 right-4 w-72 h-14"
                : "bottom-20 md:bottom-6 right-4 w-[340px] sm:w-[380px] h-[500px] max-h-[80vh]"
            )}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <motion.span
                  key={mood}
                  className="text-xl"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  {moodEmoji.face}
                </motion.span>
                <div>
                  <p className="text-sm font-bold">StatusBot</p>
                  {!isMinimized && (
                    <p className="text-[10px] opacity-80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                      Online • {moodEmoji.label}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-primary-foreground/10 rounded transition-colors">
                  <Minimize2 className="h-4 w-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary-foreground/10 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          )}
                        >
                          {msg.content.split("\n").map((line, i) => (
                            <p key={i} className={i > 0 ? "mt-1" : ""}>
                              {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                            </p>
                          ))}
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start gap-2 items-end">
                        <span className="text-lg">{MOOD_EMOJIS.thinking.face}</span>
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
                                animate={{ y: [0, -4, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-3 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua pergunta..."
                      className="flex-1 h-10 bg-muted/30 border-border/40 rounded-xl text-sm"
                      disabled={isTyping}
                    />
                    <Button size="sm" onClick={sendMessage} disabled={!input.trim() || isTyping} className="h-10 w-10 p-0 rounded-xl">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
