import { ChatSystem } from "@/components/ChatSystem";

export const MessagesPage = () => {
  return (
    <div className="bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
          <ChatSystem />
        </div>
      </div>
    </div>
  );
};
