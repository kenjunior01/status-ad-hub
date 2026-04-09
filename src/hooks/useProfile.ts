import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  niche: string | null;
  price_range: string | null;
  price_per_post: number | null;
  rating: number | null;
  total_reviews: number | null;
  total_campaigns: number | null;
  is_verified: boolean | null;
  badge_level: string | null;
  follower_count: number | null;
  engagement_rate: number | null;
  cpv_rate: number | null;
  country: string | null;
  whatsapp_views_min: number | null;
  whatsapp_views_max: number | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ProfileUpdate {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  niche?: string;
  price_range?: string;
  price_per_post?: number;
  follower_count?: number;
  engagement_rate?: number;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar suas informações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({ title: "Arquivo muito grande", description: "O avatar deve ter no máximo 5MB.", variant: "destructive" });
        return null;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Formato inválido", description: "Use JPG, PNG ou WebP.", variant: "destructive" });
        return null;
      }

      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      // Delete existing avatar first
      await supabase.storage.from('avatars').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      // Update profile with new avatar URL
      await updateProfile({ avatar_url: avatarUrl });

      toast({ title: "Avatar atualizado!", description: "Sua foto de perfil foi salva." });
      return avatarUrl;
    } catch (err) {
      console.error('Error uploading avatar:', err);
      toast({ title: "Erro no upload", description: "Não foi possível enviar a imagem.", variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas com sucesso." });
      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      toast({ title: "Erro ao salvar", description: "Ocorreu um erro ao atualizar seu perfil.", variant: "destructive" });
      throw err;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  return { profile, loading, saving, uploading, updateProfile, uploadAvatar, refetch: fetchProfile };
};
