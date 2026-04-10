import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useConversations, useMessages } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import { ImagePreview } from "@/components/ImagePreview";
import { ChatQuotationForm } from "@/components/ChatQuotationForm";
import { ChatInvoiceForm } from "@/components/ChatInvoiceForm";
import { ChatSpecialCard } from "@/components/ChatInvoiceCard";
import { 
  Send, MessageSquare, Search, MoreVertical, Check, CheckCheck, Loader2,
  WifiOff, Paperclip, Image as ImageIcon, FileText, X, Download, Receipt, Plus, Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ChatSystem = () => {
  const { toast } = useToast();
  const { conversations, loading: loadingConversations, currentUserId, refetch: refetchConversations } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { messages, loading: loadingMessages, sendMessage, uploadAttachment } = useMessages(selectedConversationId);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isConnected] = useState(true);
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const chatImages = useMemo(() => {
    return messages
      .filter(m => m.attachment_url && m.attachment_type?.startsWith('image/'))
      .map(m => ({ url: m.attachment_url!, name: m.attachment_name || undefined }));
  }, [messages]);

  const handleImageClick = useCallback((imageUrl: string) => {
    const index = chatImages.findIndex(img => img.url === imageUrl);
    setSelectedImageIndex(index >= 0 ? index : 0);
    setImagePreviewOpen(true);
  }, [chatImages]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Presence channel
  useEffect(() => {
    if (!selectedConversationId || !currentUserId) return;

    const channel = supabase.channel(`presence-${selectedConversationId}`, {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUsers = Object.entries(state).filter(([key]) => key !== currentUserId);
        const isOtherTyping = otherUsers.some(([_, presences]) => 
          (presences as any[]).some(p => p.typing === true)
        );
        setOtherUserTyping(isOtherTyping);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [selectedConversationId, currentUserId]);

  const handleTyping = useCallback(() => {
    if (!presenceChannelRef.current) return;
    presenceChannelRef.current.track({ typing: true, online_at: new Date().toISOString() });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      presenceChannelRef.current?.track({ typing: false, online_at: new Date().toISOString() });
    }, 2000);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) handleTyping();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const attachment = await uploadAttachment(file);
      setPendingAttachment(attachment);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || sending) return;
    setSending(true);
    try {
      await sendMessage(newMessage, pendingAttachment || undefined);
      setNewMessage("");
      setPendingAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const MessageStatus = ({ status }: { status: string }) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-primary" />;
      default: return null;
    }
  };

  const isQuotationMessage = (content: string) => content.startsWith('💼 Cotação:');
  const isInvoiceMessage = (content: string) => content.startsWith('🧾 Factura:');
  const isPaymentProofMessage = (content: string) => content.startsWith('💳 Comprovativo de Pagamento Offline:');
  const isPaymentMessage = (content: string) => content.startsWith('✅ Pagamento:');

  const filteredConversations = conversations.filter(c =>
    c.other_participant?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.campaign?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingConversations) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <ImagePreview 
      images={chatImages}
      initialIndex={selectedImageIndex}
      open={imagePreviewOpen}
      onOpenChange={setImagePreviewOpen}
    />
    <div className="flex h-[600px] rounded-xl border bg-card overflow-hidden shadow-lg">
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-xs py-1 px-2 flex items-center justify-center gap-1 z-10">
          <WifiOff className="h-3 w-3" /> Reconectando...
        </div>
      )}
      
      {/* Conversations List */}
      <div className="w-1/3 border-r flex flex-col bg-muted/20">
        <div className="p-4 border-b bg-card">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Mensagens
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 border-b cursor-pointer transition-all hover:bg-primary/5 ${
                  selectedConversationId === conversation.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                }`}
                onClick={() => { setSelectedConversationId(conversation.id); setShowQuotationForm(false); }}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={conversation.other_participant?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {conversation.other_participant?.display_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online dot */}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm truncate">
                        {conversation.other_participant?.display_name || 'Usuário'}
                      </p>
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {formatDate(conversation.last_message_at)}
                      </span>
                    </div>
                    {conversation.campaign && (
                      <Badge variant="secondary" className="text-[10px] h-4 mt-0.5 mb-0.5">
                        {conversation.campaign.title}
                      </Badge>
                    )}
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground truncate">
                        {conversation.last_message || 'Nenhuma mensagem'}
                      </p>
                      {(conversation.unread_count || 0) > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center bg-card shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedConversation.other_participant?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {selectedConversation.other_participant?.display_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">
                    {selectedConversation.other_participant?.display_name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {otherUserTyping ? (
                      <span className="text-primary font-medium">digitando...</span>
                    ) : selectedConversation.campaign ? (
                      selectedConversation.campaign.title
                    ) : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                   <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowQuotationForm(true)}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Criar Cotação
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowInvoiceForm(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Criar Factura
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*,.pdf';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) {
                          toast({ title: "Arquivo muito grande", description: "Máximo 10MB.", variant: "destructive" });
                          return;
                        }
                        setUploading(true);
                        try {
                          const attachment = await uploadAttachment(file);
                          await sendMessage(`💳 Comprovativo de Pagamento Offline: ${file.name}`, attachment);
                          toast({ title: "Comprovativo enviado", description: "O comprovativo foi enviado para verificação." });
                        } catch (err) {
                          console.error('Upload error:', err);
                        } finally {
                          setUploading(false);
                        }
                      };
                      input.click();
                    }}>
                      <Banknote className="h-4 w-4 mr-2" />
                      Enviar Comprovativo de Pagamento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Paperclip className="h-4 w-4 mr-2" />
                      Enviar Arquivo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quotation Form */}
            {showQuotationForm && selectedConversationId && (
              <div className="p-3 border-b">
                <ChatQuotationForm
                  conversationId={selectedConversationId}
                  onClose={() => setShowQuotationForm(false)}
                  onCreated={() => {}}
                />
              </div>
            )}

            {/* Invoice Form */}
            {showInvoiceForm && selectedConversationId && (
              <div className="p-3 border-b">
                <ChatInvoiceForm
                  conversationId={selectedConversationId}
                  onClose={() => setShowInvoiceForm(false)}
                  onCreated={() => {}}
                />
              </div>
            )}

            <ScrollArea className="flex-1 p-4 bg-muted/10">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Comece a conversa!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isMine = message.sender_id === currentUserId;
                    const isQuotation = isQuotationMessage(message.content);
                    const isInvoice = isInvoiceMessage(message.content);
                    const isPayment = isPaymentMessage(message.content);
                    const isRejection = message.content.startsWith('❌ Cotação recusada:');
                    const isProof = isPaymentProofMessage(message.content);
                    const isSpecial = isQuotation || isInvoice || isPayment || isProof;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[75%] ${isSpecial ? '' : `rounded-2xl px-3 py-2 ${
                          isMine
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-card border rounded-bl-sm shadow-sm'
                        }`}`}>
                          {/* Quotation special card */}
                          {isQuotation && (
                            <ChatSpecialCard
                              type="quotation"
                              title={message.content.replace('💼 Cotação: ', '').split(' — ')[0]}
                              amount={parseFloat(message.content.split(' — ')[1]?.replace(/[^\d.]/g, '') || '0')}
                              currency={message.content.split(' — ')[1]?.split(' ')[0] || 'USD'}
                              status="pending"
                              isMine={isMine}
                              conversationId={selectedConversationId || undefined}
                              onStatusChange={() => {}}
                            />
                          )}

                          {/* Invoice special card */}
                          {isInvoice && (() => {
                            const parts = message.content.replace('🧾 Factura: #', '').split(' — ');
                            const invoiceNum = parts[0] || '';
                            const totalStr = parts[1]?.replace(/[^\d.]/g, '') || '0';
                            const curr = parts[1]?.split(' ')[0] || 'USD';
                            return (
                              <ChatSpecialCard
                                type="invoice"
                                invoiceNumber={invoiceNum}
                                total={parseFloat(totalStr)}
                                currency={curr}
                                status="pending"
                                isMine={isMine}
                              />
                            );
                          })()}

                          {/* Payment receipt */}
                          {isPayment && (
                            <ChatSpecialCard
                              type="payment"
                              content={message.content.replace('✅ Pagamento: ', '')}
                              isMine={isMine}
                            />
                          )}

                          {/* Offline Payment Proof */}
                          {isProof && (
                            <div className={`rounded-xl p-3 border-2 border-amber-500/30 ${isMine ? 'bg-amber-500/10' : 'bg-card'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Banknote className="h-5 w-5 text-amber-500" />
                                <span className="font-semibold text-sm">Comprovativo de Pagamento</span>
                              </div>
                              {message.attachment_url && (
                                <div className="mb-2">
                                  {message.attachment_type?.startsWith('image/') ? (
                                    <button onClick={() => handleImageClick(message.attachment_url!)} className="block cursor-zoom-in">
                                      <img src={message.attachment_url} alt="Comprovativo" className="max-w-full rounded-lg max-h-40 object-cover" />
                                    </button>
                                  ) : (
                                    <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                      <FileText className="h-5 w-5" />
                                      <span className="text-sm truncate">{message.attachment_name || 'Comprovativo'}</span>
                                      <Download className="h-4 w-4 ml-auto" />
                                    </a>
                                  )}
                                </div>
                              )}
                              <p className="text-xs text-amber-600 dark:text-amber-400">⏳ Aguardando verificação do admin</p>
                            </div>
                          )}

                          {/* Normal message */}
                          {!isSpecial && (
                            <>
                              {/* Attachment */}
                              {message.attachment_url && (
                                <div className="mb-1.5">
                                  {message.attachment_type?.startsWith('image/') ? (
                                    <button
                                      onClick={() => handleImageClick(message.attachment_url!)}
                                      className="block cursor-zoom-in transition-transform hover:scale-[1.02] rounded-lg overflow-hidden"
                                    >
                                      <img 
                                        src={message.attachment_url} 
                                        alt={message.attachment_name || 'Imagem'} 
                                        className="max-w-full rounded-lg max-h-48 object-cover"
                                      />
                                    </button>
                                  ) : (
                                    <a 
                                      href={message.attachment_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 p-2 rounded-lg ${
                                        isMine ? 'bg-primary-foreground/10' : 'bg-muted'
                                      }`}
                                    >
                                      <FileText className="h-5 w-5" />
                                      <span className="text-sm truncate max-w-[150px]">
                                        {message.attachment_name || 'Arquivo'}
                                      </span>
                                      <Download className="h-4 w-4 ml-auto" />
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {message.content && !message.content.startsWith('📎') && (
                                <p className="text-sm leading-relaxed">{message.content}</p>
                              )}
                            </>
                          )}

                          {!isSpecial && (
                            <div className={`flex items-center justify-end gap-1 mt-0.5 ${
                              isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'
                            }`}>
                              <span className="text-[10px]">{formatTime(message.created_at)}</span>
                              {isMine && <MessageStatus status={message.status} />}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {otherUserTyping && (
                    <div className="flex justify-start">
                      <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-3 border-t bg-card space-y-2">
              {pendingAttachment && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  {pendingAttachment.type.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm truncate flex-1">{pendingAttachment.name}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingAttachment(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                
                <Input
                  placeholder="Escreva uma mensagem..."
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-muted/50 border-0 focus-visible:ring-1"
                  disabled={sending || uploading}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={(!newMessage.trim() && !pendingAttachment) || sending || uploading}
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8 bg-muted/10">
            <div>
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Suas Mensagens</h3>
              <p className="text-muted-foreground text-sm max-w-[250px]">
                Selecione uma conversa para começar a trocar mensagens, cotações e facturas
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export const ChatButton = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[900px] max-w-full p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <ChatSystem />
      </SheetContent>
    </Sheet>
  );
};
