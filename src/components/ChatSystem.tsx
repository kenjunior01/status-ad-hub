import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useConversations, useMessages } from "@/hooks/useConversations";
import { supabase } from "@/integrations/supabase/client";
import { ImagePreview } from "@/components/ImagePreview";
import { ChatQuotationForm } from "@/components/ChatQuotationForm";
import { ChatInvoiceForm } from "@/components/ChatInvoiceForm";
import { ChatSpecialCard } from "@/components/ChatInvoiceCard";
import { MascotInline } from "@/components/MascotInline";
import { 
  Send, MessageSquare, Search, MoreVertical, Check, CheckCheck, Loader2,
  WifiOff, Paperclip, Image as ImageIcon, FileText, X, Download, Receipt, Plus, Banknote, ArrowLeft,
  Smile, ThumbsUp, Heart, Star, Zap, Gift, PartyPopper, HandshakeIcon
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
    return () => { supabase.removeChannel(channel); presenceChannelRef.current = null; };
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
      <div className="flex h-full md:h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile: show conversation list or chat, not both
  const showMobileChat = selectedConversationId && selectedConversation;

  const renderConversationList = () => (
    <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 border-r flex-col bg-muted/20`}>
      <div className="p-3 md:p-4 border-b bg-card">
        <h2 className="font-bold text-base md:text-lg mb-2 md:mb-3 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mensagens
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 h-9"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <MascotInline mood="thinking" size="md" message="Candidate-se a anúncios para iniciar conversas!" bubblePosition="top" />
            <p className="text-sm mt-4">Nenhuma conversa ainda</p>
            <p className="text-xs text-muted-foreground/60 mt-1">As conversas aparecem quando candidata-se a anúncios</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-3 border-b cursor-pointer transition-all hover:bg-primary/5 ${
                selectedConversationId === conversation.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
              }`}
              onClick={() => { setSelectedConversationId(conversation.id); setShowQuotationForm(false); setShowInvoiceForm(false); }}
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conversation.other_participant?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {conversation.other_participant?.display_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card" />
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
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full ml-1">
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
  );

  const renderChatArea = () => (
    <div className={`${!showMobileChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
      {selectedConversation ? (
        <>
          {/* Chat Header */}
          <div className="px-3 md:px-4 py-2.5 md:py-3 border-b flex justify-between items-center bg-card shadow-sm">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile back button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 md:hidden shrink-0"
                onClick={() => setSelectedConversationId(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8 md:h-9 md:w-9">
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
                 <DropdownMenuContent align="end" className="w-56">
                   <DropdownMenuItem onClick={() => setShowQuotationForm(true)}>
                     <Receipt className="h-4 w-4 mr-2" />
                     Criar Cotação
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => setShowInvoiceForm(true)}>
                     <FileText className="h-4 w-4 mr-2" />
                     Criar Factura
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={() => {
                     sendMessage("🤝 Proposta de parceria — Vamos fechar negócio?");
                   }}>
                     <HandshakeIcon className="h-4 w-4 mr-2" />
                     Propor Parceria
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => {
                     sendMessage("✅ Pagamento confirmado! Obrigado pela confiança. 🎉");
                   }}>
                     <Banknote className="h-4 w-4 mr-2" />
                     Confirmar Pagamento
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
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
                     Enviar Comprovativo
                   </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                     <Paperclip className="h-4 w-4 mr-2" />
                     Enviar Arquivo
                   </DropdownMenuItem>
                 </DropdownMenuContent>
              </DropdownMenu>
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

          <ScrollArea className="flex-1 p-3 md:p-4 bg-muted/10">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <MascotInline mood="waving" size="lg" message="Diga olá e comece a negociar! 🤝" bubblePosition="top" />
                <p className="text-muted-foreground text-sm mt-2">Envie uma mensagem para iniciar</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {messages.map((message) => {
                  const isMine = message.sender_id === currentUserId;
                  const isQuotation = isQuotationMessage(message.content);
                  const isInvoice = isInvoiceMessage(message.content);
                  const isPayment = isPaymentMessage(message.content);
                  const isRejection = message.content.startsWith('❌ Cotação recusada:');
                  const isProof = isPaymentProofMessage(message.content);
                  const isSpecial = isQuotation || isInvoice || isPayment || isProof;

                  return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] md:max-w-[75%] ${isSpecial ? '' : `rounded-2xl px-3 py-2 ${
                        isMine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border rounded-bl-sm shadow-sm'
                      }`}`}>
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
                        {isInvoice && (() => {
                          const parts = message.content.replace('🧾 Factura: #', '').split(' — ');
                          const invoiceNum = parts[0] || '';
                          const totalStr = parts[1]?.replace(/[^\d.]/g, '') || '0';
                          const curr = parts[1]?.split(' ')[0] || 'USD';
                          return (
                            <ChatSpecialCard type="invoice" invoiceNumber={invoiceNum} total={parseFloat(totalStr)} currency={curr} status="pending" isMine={isMine} />
                          );
                        })()}
                        {isPayment && (
                          <ChatSpecialCard type="payment" content={message.content.replace('✅ Pagamento: ', '')} isMine={isMine} />
                        )}
                        {isProof && (
                          <div className={`rounded-xl p-3 border-2 border-amber-500/30 ${isMine ? 'bg-amber-500/10' : 'bg-card'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Banknote className="h-4 w-4 text-amber-500" />
                              <span className="font-semibold text-xs">Comprovativo de Pagamento</span>
                            </div>
                            {message.attachment_url && (
                              <div className="mb-2">
                                {message.attachment_type?.startsWith('image/') ? (
                                  <button onClick={() => handleImageClick(message.attachment_url!)} className="block cursor-zoom-in">
                                    <img src={message.attachment_url} alt="Comprovativo" className="max-w-full rounded-lg max-h-40 object-cover" />
                                  </button>
                                ) : (
                                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                                    <FileText className="h-4 w-4" /><span className="text-xs truncate">{message.attachment_name || 'Comprovativo'}</span><Download className="h-3 w-3 ml-auto" />
                                  </a>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">⏳ Aguardando verificação</p>
                          </div>
                        )}
                        {!isSpecial && (
                          <>
                            {message.attachment_url && (
                              <div className="mb-1.5">
                                {message.attachment_type?.startsWith('image/') ? (
                                  <button onClick={() => handleImageClick(message.attachment_url!)} className="block cursor-zoom-in rounded-lg overflow-hidden">
                                    <img src={message.attachment_url} alt={message.attachment_name || 'Imagem'} className="max-w-full rounded-lg max-h-48 object-cover" />
                                  </button>
                                ) : (
                                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg ${isMine ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
                                    <FileText className="h-4 w-4" /><span className="text-xs truncate max-w-[150px]">{message.attachment_name || 'Arquivo'}</span><Download className="h-3 w-3 ml-auto" />
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
                          <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            <span className="text-[10px]">{formatTime(message.created_at)}</span>
                            {isMine && <MessageStatus status={message.status} />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {otherUserTyping && (
                  <div className="flex justify-start">
                    <div className="bg-card border rounded-2xl rounded-bl-sm px-4 py-2 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-2.5 md:p-3 border-t bg-card space-y-2">
            {pendingAttachment && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                {pendingAttachment.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                <span className="text-xs truncate flex-1">{pendingAttachment.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingAttachment(null)}><X className="h-3 w-3" /></Button>
              </div>
            )}
            {/* Quick reactions */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
              {["👍", "❤️", "🔥", "🎉", "💰", "✅", "🤝", "⭐"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendMessage(emoji)}
                  className="shrink-0 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input
                placeholder="Escreva uma mensagem..."
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 h-9 text-sm"
                disabled={sending || uploading}
              />
              <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !pendingAttachment) || sending || uploading} size="icon" className="h-9 w-9 shrink-0 rounded-full">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-8 bg-muted/10 gap-4">
          <MascotInline mood="happy" size="xl" message="Selecione uma conversa para negociar! 💬" bubblePosition="top" />
          <h3 className="text-lg font-semibold mt-4">Suas Mensagens</h3>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            Gerencie cotações, facturas e pagamentos directamente no chat
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <ImagePreview 
        images={chatImages}
        initialIndex={selectedImageIndex}
        open={imagePreviewOpen}
        onOpenChange={setImagePreviewOpen}
      />
      <div className="flex h-full md:h-[600px] rounded-xl border bg-card overflow-hidden shadow-lg">
        {!isConnected && (
          <div className="absolute top-0 left-0 right-0 bg-destructive text-destructive-foreground text-xs py-1 px-2 flex items-center justify-center gap-1 z-10">
            <WifiOff className="h-3 w-3" /> Reconectando...
          </div>
        )}
        {renderConversationList()}
        {renderChatArea()}
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
      <SheetContent side="right" className="w-full md:w-[900px] max-w-full p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat</SheetTitle>
        </SheetHeader>
        <ChatSystem />
      </SheetContent>
    </Sheet>
  );
};
