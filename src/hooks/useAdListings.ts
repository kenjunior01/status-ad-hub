import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdListing {
  id: string;
  advertiser_id: string;
  title: string;
  description: string | null;
  budget: number;
  currency: string;
  category: string | null;
  duration_days: number | null;
  requirements: string | null;
  max_applications: number | null;
  status: string;
  created_at: string;
  application_count?: number;
  my_application?: { id: string; status: string } | null;
}

interface ListingApplication {
  id: string;
  listing_id: string;
  creator_id: string;
  message: string | null;
  proposed_price: number | null;
  status: string;
  created_at: string;
  creator_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    niche: string | null;
    rating: number | null;
  };
}

export const useAdListings = () => {
  const [listings, setListings] = useState<AdListing[]>([]);
  const [myListings, setMyListings] = useState<AdListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchListings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // All open listings
      const { data, error } = await supabase
        .from('ad_listings')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      let enriched = data || [];

      // If user is logged in, check their applications
      if (user) {
        const { data: apps } = await supabase
          .from('listing_applications')
          .select('id, listing_id, status')
          .eq('creator_id', user.id);

        const appMap = new Map((apps || []).map(a => [a.listing_id, { id: a.id, status: a.status }]));
        enriched = enriched.map(l => ({ ...l, my_application: appMap.get(l.id) || null }));

        // My listings (advertiser)
        const { data: mine } = await supabase
          .from('ad_listings')
          .select('*')
          .eq('advertiser_id', user.id)
          .order('created_at', { ascending: false });
        setMyListings(mine || []);
      }

      setListings(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createListing = async (data: { title: string; description: string; budget: number; category: string; duration_days: number; requirements: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { error } = await supabase.from('ad_listings').insert({
      advertiser_id: user.id,
      title: data.title,
      description: data.description || null,
      budget: data.budget,
      category: data.category || null,
      duration_days: data.duration_days || 7,
      requirements: data.requirements || null,
    });

    if (error) throw error;
    toast({ title: '✅ Anúncio publicado!', description: 'Criadores podem agora candidatar-se.' });
    fetchListings();
  };

  const applyToListing = async (listingId: string, message: string, proposedPrice?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { error } = await supabase.from('listing_applications').insert({
      listing_id: listingId,
      creator_id: user.id,
      message: message || null,
      proposed_price: proposedPrice || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Já se candidatou', description: 'Já enviou candidatura para este anúncio.', variant: 'destructive' });
        return;
      }
      throw error;
    }
    toast({ title: '✅ Candidatura enviada!' });
    fetchListings();
  };

  const getApplications = async (listingId: string): Promise<ListingApplication[]> => {
    const { data, error } = await supabase
      .from('listing_applications')
      .select('*')
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Enrich with creator profiles
    const enriched = await Promise.all(
      (data || []).map(async (app) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, niche, rating')
          .eq('user_id', app.creator_id)
          .maybeSingle();
        return { ...app, creator_profile: profile };
      })
    );

    return enriched;
  };

  const updateApplicationStatus = async (applicationId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('listing_applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (error) throw error;
    toast({ title: status === 'accepted' ? '✅ Candidatura aceite!' : '❌ Candidatura recusada' });
  };

  const closeListing = async (listingId: string) => {
    const { error } = await supabase
      .from('ad_listings')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', listingId);

    if (error) throw error;
    toast({ title: 'Anúncio encerrado' });
    fetchListings();
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return {
    listings,
    myListings,
    loading,
    currentUserId,
    createListing,
    applyToListing,
    getApplications,
    updateApplicationStatus,
    closeListing,
    refetch: fetchListings,
  };
};
