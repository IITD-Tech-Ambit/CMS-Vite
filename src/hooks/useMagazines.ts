import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Magazine, MagazineStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { calculateReadTime } from '@/lib/readTime';
import { useToast } from '@/hooks/use-toast';

interface UseMagazinesOptions {
  mine?: boolean;
  status?: MagazineStatus;
}

export function useMagazines(options: UseMagazinesOptions = {}) {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const fetchMagazines = async () => {
    if (!user) {
      setMagazines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('magazines')
        .select('*')
        .order('created_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      setMagazines((data || []) as Magazine[]);
    } catch (error) {
      console.error('Error fetching magazines:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch magazines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMagazines();
  }, [user, options.mine, options.status]);

  const createMagazine = async (
    data: { title: string; subtitle: string; body_markdown: string },
    heroImage?: File | null
  ) => {
    if (!user || !profile) {
      return { error: new Error('Not authenticated') };
    }

    try {
      let heroImageUrl: string | null = null;
      let heroThumbnailUrl: string | null = null;

      if (heroImage) {
        const fileExt = heroImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('magazine-images')
          .upload(fileName, heroImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('magazine-images')
          .getPublicUrl(fileName);

        heroImageUrl = urlData.publicUrl;
        heroThumbnailUrl = urlData.publicUrl;
      }

      const readTimeMinutes = calculateReadTime(data.body_markdown);

      const { error } = await supabase.from('magazines').insert({
        title: data.title,
        subtitle: data.subtitle || null,
        body_markdown: data.body_markdown,
        hero_image_url: heroImageUrl,
        hero_thumbnail_url: heroThumbnailUrl,
        author_name: profile.name,
        author_id: user.id,
        read_time_minutes: readTimeMinutes,
        status: 'pending' as MagazineStatus,
      });

      if (error) throw error;

      await fetchMagazines();
      return { error: null };
    } catch (error) {
      console.error('Error creating magazine:', error);
      return { error: error as Error };
    }
  };

  const updateMagazine = async (
    id: string,
    data: { title: string; subtitle: string; body_markdown: string },
    heroImage?: File | null
  ) => {
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      let updateData: Record<string, unknown> = {
        title: data.title,
        subtitle: data.subtitle || null,
        body_markdown: data.body_markdown,
        read_time_minutes: calculateReadTime(data.body_markdown),
      };

      if (heroImage) {
        const fileExt = heroImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('magazine-images')
          .upload(fileName, heroImage);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('magazine-images')
          .getPublicUrl(fileName);

        updateData.hero_image_url = urlData.publicUrl;
        updateData.hero_thumbnail_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from('magazines')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await fetchMagazines();
      return { error: null };
    } catch (error) {
      console.error('Error updating magazine:', error);
      return { error: error as Error };
    }
  };

  const deleteMagazine = async (id: string) => {
    try {
      const { error } = await supabase
        .from('magazines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchMagazines();
      return { error: null };
    } catch (error) {
      console.error('Error deleting magazine:', error);
      return { error: error as Error };
    }
  };

  const updateStatus = async (id: string, status: MagazineStatus) => {
    if (role !== 'admin') {
      return { error: new Error('Unauthorized') };
    }

    try {
      const { error } = await supabase
        .from('magazines')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      await fetchMagazines();
      return { error: null };
    } catch (error) {
      console.error('Error updating status:', error);
      return { error: error as Error };
    }
  };

  return {
    magazines,
    loading,
    createMagazine,
    updateMagazine,
    deleteMagazine,
    updateStatus,
    refetch: fetchMagazines,
  };
}
