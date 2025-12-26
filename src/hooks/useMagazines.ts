import { useState, useEffect, useCallback } from 'react';
import { Magazine, MagazineFormData, MagazineStatus } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { calculateReadTime } from '@/lib/readTime';
import { useToast } from '@/hooks/use-toast';

const MAGAZINES_STORAGE_KEY = 'magazine_data';

// Map frontend status to backend status
const statusToBackend = (status: MagazineStatus): string => {
  if (status === 'approved') return 'online';
  if (status === 'disapproved') return 'archived';
  return status; // 'pending' stays the same
};

// Map backend status to frontend status
const statusToFrontend = (status: string): MagazineStatus => {
  if (status === 'online') return 'approved';
  if (status === 'archived') return 'disapproved';
  return status as MagazineStatus; // 'pending' stays the same
};

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface StatusCounts {
  pending: number;
  approved: number;
  disapproved: number;
  total: number;
}

interface UseMagazinesOptions {
  mine?: boolean;
  status?: MagazineStatus;
  page?: number;
  limit?: number;
}

export function useMagazines(options: UseMagazinesOptions = {}) {
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: options.page || 1,
    totalPages: 1,
    totalCount: 0,
    limit: options.limit || 9,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    pending: 0,
    approved: 0,
    disapproved: 0,
    total: 0,
  });
  const { user, profile, role } = useAuth();
  const { toast } = useToast();

  const loadMagazines = useCallback(async (page: number = pagination.currentPage) => {
    setLoading(true);
    const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
    const token = localStorage.getItem('magazine_token');

    // If token present, call backend API with pagination
    if (token && user) {
      try {
        // Build URL with pagination query params
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(options.limit || 9));
        if (options.status) {
          params.set('status', statusToBackend(options.status));
        }

        const url = `${api}/api/content/paginated?${params.toString()}`;
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = await resp.json();

        if (resp.ok && json.success) {
          let items = json.data?.magazines || [];
          const paginationData = json.data?.pagination || {};

          // Filter by user's content if mine option is true (client-side filter for user's own content)
          if (options.mine && role !== 'admin') {
            items = items.filter((m: any) => m.created_by === user.id || (m.created_by?._id === user.id));
          }

          // normalize backend content shape to frontend expected shape
          const mapped = items.map((m: any) => {
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
              body_markdown: m.body || m.bodyMarkdown || m.body_markdown || null,
              body_html: m.bodyHtml || m.body_html || null,
              hero_image_url: makeAbsolute(m.image_url || m.hero_image_url),
              hero_thumbnail_url: makeAbsolute(m.image_url || m.hero_thumbnail_url),
              author_id: m.created_by?._id || m.created_by || m.author_id || null,
              author_name: m.created_by?.name || m.author_name || null,
              read_time_minutes: m.est_read_time || m.read_time_minutes || m.read_time || 0,
              word_count: m.wordCount || m.word_count || 0,
              status: statusToFrontend(m.status || 'pending'),
              created_at: m.createdAt || m.created_at,
              updated_at: m.updatedAt || m.updated_at,
            } as Magazine);
          });

          setMagazines(mapped);
          setPagination({
            currentPage: paginationData.currentPage || page,
            totalPages: paginationData.totalPages || 1,
            totalCount: paginationData.totalCount || mapped.length,
            limit: paginationData.limit || options.limit || 9,
            hasNextPage: paginationData.hasNextPage || false,
            hasPrevPage: paginationData.hasPrevPage || false,
          });
          // Update status counts from API response
          const statusCountsData = json.data?.statusCounts || {};
          setStatusCounts({
            pending: statusCountsData.pending || 0,
            approved: statusCountsData.approved || 0,
            disapproved: statusCountsData.disapproved || 0,
            total: statusCountsData.total || 0,
          });
        } else {
          setMagazines([]);
          setPagination(prev => ({ ...prev, currentPage: 1, totalPages: 1, totalCount: 0 }));
        }
      } catch (e) {
        console.warn('Failed to fetch content from API', e);
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

    // Client-side pagination for localStorage fallback
    const limit = options.limit || 9;
    const totalCount = allMagazines.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedItems = allMagazines.slice(startIndex, startIndex + limit);

    setMagazines(paginatedItems);
    setPagination({
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    });
    setLoading(false);
  }, [options.mine, options.status, options.limit, user, role, pagination.currentPage]);

  // Page navigation functions
  const setPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadMagazines(page);
    }
  }, [loadMagazines, pagination.totalPages]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      loadMagazines(pagination.currentPage + 1);
    }
  }, [loadMagazines, pagination.currentPage, pagination.hasNextPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      loadMagazines(pagination.currentPage - 1);
    }
  }, [loadMagazines, pagination.currentPage, pagination.hasPrevPage]);

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
    const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';

    if (token && user) {
      try {
        const form = new FormData();
        form.append('title', data.title);
        form.append('subtitle', data.subtitle || ''); // Backend requires subtitle
        form.append('body', data.body_markdown);
        form.append('est_read_time', String(calculateReadTime(data.body_markdown)));
        if (heroImage) form.append('hero_img', heroImage);

        const resp = await fetch(`${api}/api/content`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) {
          // Log detailed error for debugging
          console.error('Create content failed:', json);
          const errorMsg = json.errors
            ? json.errors.map((e: any) => e.message || e.field).join(', ')
            : json.message || 'Create failed';
          return { error: new Error(errorMsg) };
        }
        await loadMagazines();
        return { error: null };
      } catch (e) {
        console.error('Create content error:', e);
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
    const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
    if (token) {
      try {
        const form = new FormData();
        form.append('id', id);
        if (data.title) form.append('title', data.title);
        if (data.subtitle) form.append('subtitle', data.subtitle);
        if (data.body_markdown) {
          form.append('body', data.body_markdown);
          form.append('est_read_time', String(calculateReadTime(data.body_markdown)));
        }
        if (heroImage) form.append('hero_img', heroImage);

        const resp = await fetch(`${api}/api/content`, {
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
    const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';

    // If token present, call backend API
    if (token) {
      try {
        const resp = await fetch(`${api}/api/content`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id }),
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
    const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';

    // If token present, call backend API
    if (token) {
      try {
        // Map frontend status to backend status
        const backendStatus = statusToBackend(status);

        const resp = await fetch(`${api}/api/content/status`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contentId: id, status: backendStatus }),
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
    pagination,
    statusCounts,
    setPage,
    nextPage,
    prevPage,
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
