import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface Comment {
    _id: string;
    body: string;
    created_by: {
        _id: string;
        name: string;
    } | null;
    ip_address: string;
    createdAt: string;
    updatedAt: string;
}

export interface Analytics {
    _id: string;
    content: string;
    likes: Array<{
        user: string | null;
        ip_address: string;
    }>;
    comments: Comment[];
    createdAt: string;
    updatedAt: string;
}

interface UseAnalyticsResult {
    loading: boolean;
    error: Error | null;
    addLike: (contentId: string) => Promise<{ success: boolean; error?: string; likesCount?: number }>;
    removeLike: (contentId: string) => Promise<{ success: boolean; error?: string; likesCount?: number }>;
    addComment: (contentId: string, body: string) => Promise<{ success: boolean; error?: string; comment?: Comment }>;
    removeComment: (contentId: string, commentId: string) => Promise<{ success: boolean; error?: string }>;
    hasUserLiked: (analytics: Analytics | null, userId: string | null) => boolean;
}

export function useAnalytics(): UseAnalyticsResult {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const { user } = useAuth();

    const getApiUrl = () => import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
    const getToken = () => localStorage.getItem('magazine_token');

    const addLike = useCallback(async (contentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const api = getApiUrl();
            const token = getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${api}/api/content/like`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ contentId }),
            });
            const json = await resp.json();

            if (!resp.ok || !json.success) {
                return { success: false, error: json.message || 'Failed to add like' };
            }

            return {
                success: true,
                likesCount: json.data?.likes?.length || 0
            };
        } catch (e) {
            const err = e as Error;
            setError(err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const removeLike = useCallback(async (contentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const api = getApiUrl();
            const token = getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${api}/api/content/dislike`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ contentId }),
            });
            const json = await resp.json();

            if (!resp.ok || !json.success) {
                return { success: false, error: json.message || 'Failed to remove like' };
            }

            return {
                success: true,
                likesCount: json.data?.likes?.length || 0
            };
        } catch (e) {
            const err = e as Error;
            setError(err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const addComment = useCallback(async (contentId: string, body: string) => {
        setLoading(true);
        setError(null);
        try {
            const api = getApiUrl();
            const token = getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${api}/api/content/comment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ contentId, body }),
            });
            const json = await resp.json();

            if (!resp.ok || !json.success) {
                return { success: false, error: json.message || 'Failed to add comment' };
            }

            return {
                success: true,
                comment: json.data
            };
        } catch (e) {
            const err = e as Error;
            setError(err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const removeComment = useCallback(async (contentId: string, commentId: string) => {
        setLoading(true);
        setError(null);
        try {
            const api = getApiUrl();
            const token = getToken();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const resp = await fetch(`${api}/api/content/uncomment`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ contentId, commentId }),
            });
            const json = await resp.json();

            if (!resp.ok || !json.success) {
                return { success: false, error: json.message || 'Failed to remove comment' };
            }

            return { success: true };
        } catch (e) {
            const err = e as Error;
            setError(err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const hasUserLiked = useCallback((analytics: Analytics | null, userId: string | null): boolean => {
        if (!analytics || !analytics.likes) return false;
        if (!userId) return false;
        return analytics.likes.some(like => like.user === userId);
    }, []);

    return {
        loading,
        error,
        addLike,
        removeLike,
        addComment,
        removeComment,
        hasUserLiked,
    };
}
