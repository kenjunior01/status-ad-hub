import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChatSystem } from "@/components/ChatSystem";
import { MascotInline } from "@/components/MascotInline";
import { MessageSquare } from "lucide-react";

export const MessagesPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border/30">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">
            {t("navigation.messages") || "Mensagens"}
          </h1>
          <MascotInline mood="happy" size="xs" showBubble={false} animate={false} />
        </div>

        {/* Chat System - full height */}
        <div className="h-[calc(100vh-8rem)]">
          <ChatSystem />
        </div>
      </div>
    </div>
  );
};
