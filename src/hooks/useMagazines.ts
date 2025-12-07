import { useState, useEffect, useCallback } from 'react';
import { Magazine, MagazineFormData, MagazineStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { calculateReadTime } from '@/lib/readTime';
import { useToast } from '@/hooks/use-toast';

const MAGAZINES_STORAGE_KEY = 'magazine_data';

interface UseMagazinesOptions {
  mine?: boolean;
  status?: MagazineStatus;
}

export function useMagazines(options: UseMagazinesOptions = {}) {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const loadMagazines = useCallback(() => {
    const stored = localStorage.getItem(MAGAZINES_STORAGE_KEY);
    let allMagazines: Magazine[] = stored ? JSON.parse(stored) : [];
    
    // Filter by user if mine option is true and not admin
    if (options.mine && user && role !== 'admin') {
      allMagazines = allMagazines.filter(m => m.author_id === user.id);
    }
    
    // Filter by status if specified
    if (options.status) {
      allMagazines = allMagazines.filter(m => m.status === options.status);
    }
    
    // Sort by created_at descending
    allMagazines.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setMagazines(allMagazines);
    setLoading(false);
  }, [options.mine, options.status, user, role]);

  useEffect(() => {
    loadMagazines();
  }, [loadMagazines]);

  const saveMagazines = (newMagazines: Magazine[]) => {
    localStorage.setItem(MAGAZINES_STORAGE_KEY, JSON.stringify(newMagazines));
  };

  const createMagazine = async (
    data: MagazineFormData,
    heroImage?: File | null
  ): Promise<{ error: Error | null }> => {
    if (!user || !profile) {
      return { error: new Error('Not authenticated') };
    }

    try {
      let heroImageUrl: string | null = null;
      let heroThumbnailUrl: string | null = null;

      if (heroImage) {
        // Convert image to base64 for localStorage storage
        heroImageUrl = await fileToBase64(heroImage);
        heroThumbnailUrl = heroImageUrl;
      }

      const readTimeMinutes = calculateReadTime(data.body_markdown);

      const newMagazine: Magazine = {
        id: `mag_${Date.now()}`,
        title: data.title,
        subtitle: data.subtitle || null,
        body_markdown: data.body_markdown,
        hero_image_url: heroImageUrl,
        hero_thumbnail_url: heroThumbnailUrl,
        author_id: user.id,
        author_name: profile.name,
        read_time_minutes: readTimeMinutes,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const stored = localStorage.getItem(MAGAZINES_STORAGE_KEY);
      const allMagazines: Magazine[] = stored ? JSON.parse(stored) : [];
      allMagazines.push(newMagazine);
      saveMagazines(allMagazines);
      
      loadMagazines();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateMagazine = async (
    id: string,
    data: MagazineFormData,
    heroImage?: File | null
  ): Promise<{ error: Error | null }> => {
    try {
      const stored = localStorage.getItem(MAGAZINES_STORAGE_KEY);
      const allMagazines: Magazine[] = stored ? JSON.parse(stored) : [];
      const index = allMagazines.findIndex(m => m.id === id);
      
      if (index === -1) {
        return { error: new Error('Magazine not found') };
      }

      let heroImageUrl = allMagazines[index].hero_image_url;
      let heroThumbnailUrl = allMagazines[index].hero_thumbnail_url;

      if (heroImage) {
        heroImageUrl = await fileToBase64(heroImage);
        heroThumbnailUrl = heroImageUrl;
      }

      const readTimeMinutes = data.body_markdown 
        ? calculateReadTime(data.body_markdown)
        : allMagazines[index].read_time_minutes;

      allMagazines[index] = {
        ...allMagazines[index],
        title: data.title,
        subtitle: data.subtitle || null,
        body_markdown: data.body_markdown,
        hero_image_url: heroImageUrl,
        hero_thumbnail_url: heroThumbnailUrl,
        read_time_minutes: readTimeMinutes,
        updated_at: new Date().toISOString(),
      };

      saveMagazines(allMagazines);
      loadMagazines();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const deleteMagazine = async (id: string): Promise<{ error: Error | null }> => {
    try {
      const stored = localStorage.getItem(MAGAZINES_STORAGE_KEY);
      const allMagazines: Magazine[] = stored ? JSON.parse(stored) : [];
      const filtered = allMagazines.filter(m => m.id !== id);
      
      saveMagazines(filtered);
      loadMagazines();
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const updateStatus = async (id: string, status: MagazineStatus): Promise<{ error: Error | null }> => {
    if (role !== 'admin') {
      return { error: new Error('Unauthorized') };
    }

    try {
      const stored = localStorage.getItem(MAGAZINES_STORAGE_KEY);
      const allMagazines: Magazine[] = stored ? JSON.parse(stored) : [];
      const index = allMagazines.findIndex(m => m.id === id);
      
      if (index === -1) {
        return { error: new Error('Magazine not found') };
      }

      allMagazines[index] = {
        ...allMagazines[index],
        status,
        updated_at: new Date().toISOString(),
      };

      saveMagazines(allMagazines);
      loadMagazines();
      return { error: null };
    } catch (error) {
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
    refetch: loadMagazines,
  };
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}
