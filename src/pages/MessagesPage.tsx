import { ChatSystem } from "@/components/ChatSystem";

interface MessagesPageProps {
  initialConversationId?: string | null;
  onConversationOpened?: () => void;
}

export const MessagesPage = ({ initialConversationId, onConversationOpened }: MessagesPageProps) => {
  return (
    <div className="bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
          <ChatSystem 
            initialConversationId={initialConversationId} 
            onConversationOpened={onConversationOpened}
          />
        </div>
      </div>
    </div>
  );
};
