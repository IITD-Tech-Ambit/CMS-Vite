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

  const loadMagazines = useCallback(async () => {
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('magazine_token');

    // If token present, call backend API
    if (token && user) {
      try {
        const params = new URLSearchParams();
        if (options.mine) params.set('mine', 'true');
        if (options.status) params.set('status', options.status);
        const url = `${api}/magazines?${params.toString()}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await resp.json();
        if (resp.ok && json.success) {
          const items = json.data || [];
          // normalize backend magazine shape to frontend expected shape
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mapped = items.map((m: any) => {
            // Use full image URL for hero, thumbnail URL for thumbnail (fallback to full if no thumbnail)
            const rawHero = (m.heroImage && m.heroImage.url) || m.hero_image_url || null;
            const rawThumb = (m.heroImage && (m.heroImage.thumbnailUrl || m.heroImage.url)) || m.hero_thumbnail_url || null;
            const makeAbsolute = (p: string | null) => {
              if (!p) return null;
              if (p.startsWith('http://') || p.startsWith('https://')) return p;
              if (p.startsWith('/uploads/')) return `${api.replace(/\/$/, '')}${p}`;
              return p;
            };

            return ({
              id: m._id || m.id,
              title: m.title,
              subtitle: m.subtitle || null,
              body_markdown: m.bodyMarkdown || m.body_markdown || null,
              body_html: m.bodyHtml || m.body_html || null,
              hero_image_url: makeAbsolute(rawHero),
              hero_thumbnail_url: makeAbsolute(rawThumb),
              author_id: m.authorId || m.author_id || (m.author && (m.author._id || m.author.id)) || null,
              author_name: m.authorName || m.author_name || (m.author && (m.author.name)) || null,
              read_time_minutes: m.readTimeMinutes || m.read_time_minutes || m.read_time || 0,
              word_count: m.wordCount || m.word_count || 0,
              status: m.status || 'pending',
              created_at: m.createdAt || m.created_at,
              updated_at: m.updatedAt || m.updated_at,
            } as Magazine);
          });
          setMagazines(mapped);
        } else {
          setMagazines([]);
        }
      } catch (e) {
        console.warn('Failed to fetch magazines from API', e);
        setMagazines([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Fallback to localStorage for demo/non-authenticated mode
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
    const token = localStorage.getItem('magazine_token');
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    if (token && user) {
      try {
        const form = new FormData();
        form.append('title', data.title);
        form.append('bodyMarkdown', data.body_markdown);
        if (data.subtitle) form.append('subtitle', data.subtitle);
        if (heroImage) form.append('heroImage', heroImage);

        const resp = await fetch(`${api}/magazines`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) return { error: new Error(json.message || 'Create failed') };
        await loadMagazines();
        return { error: null };
      } catch (e) {
        return { error: e as Error };
      }
    }

    // Fallback local mode
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
    const token = localStorage.getItem('magazine_token');
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    if (token) {
      try {
        const form = new FormData();
        if (data.title) form.append('title', data.title);
        if (data.subtitle) form.append('subtitle', data.subtitle);
        if (data.body_markdown) form.append('bodyMarkdown', data.body_markdown);
        if (heroImage) form.append('heroImage', heroImage);

        const resp = await fetch(`${api}/magazines/${id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) return { error: new Error(json.message || 'Update failed') };
        await loadMagazines();
        return { error: null };
      } catch (e) {
        return { error: e as Error };
      }
    }

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
    const token = localStorage.getItem('magazine_token');
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    // If token present, call backend API
    if (token) {
      try {
        const resp = await fetch(`${api}/magazines/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) {
          console.error('Delete failed:', json);
          return { error: new Error(json.message || 'Delete failed') };
        }
        await loadMagazines();
        return { error: null };
      } catch (e) {
        console.error('Delete error:', e);
        return { error: e as Error };
      }
    }

    // Fallback to localStorage
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

    const token = localStorage.getItem('magazine_token');
    const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    // If token present, call backend API
    if (token) {
      try {
        const endpoint = status === 'approved' 
          ? `${api}/magazines/${id}/approve`
          : `${api}/magazines/${id}/disapprove`;
        
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) {
          return { error: new Error(json.message || 'Status update failed') };
        }
        await loadMagazines();
        return { error: null };
      } catch (e) {
        return { error: e as Error };
      }
    }

    // Fallback to localStorage
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
