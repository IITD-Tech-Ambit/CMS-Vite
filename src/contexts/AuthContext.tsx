import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRole, Profile } from '@/types/database';

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users database
const MOCK_USERS: Record<string, { password: string; name: string; role: AppRole }> = {
  'admin@example.com': { password: 'password', name: 'Admin User', role: 'admin' },
  'user1@example.com': { password: 'password', name: 'Test User', role: 'user' },
};

const AUTH_STORAGE_KEY = 'magazine_auth';
const TOKEN_STORAGE_KEY = 'magazine_token';
const PROFILES_STORAGE_KEY = 'magazine_profiles';
const REGISTERED_USERS_KEY = 'registered_users';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    // on mount, try to load token and fetch /auth/me
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const resp = await fetch(`${api}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setLoading(false);
          return;
        }
        const json = await resp.json();
        if (json && json.success && json.data) {
          const me = json.data as any;
          const newUser: User = { id: me._id, email: me.email };
          setUser(newUser);
          const userProfile: Profile = {
            id: me._id,
            user_id: me._id,
            name: me.name,
            email: me.email,
            avatar_url: (me.avatar_url as string) || null,
            created_at: me.createdAt,
            updated_at: me.updatedAt,
          };
          setProfile(userProfile);
          setRole(me.role || 'user');
          saveAuthState(newUser, userProfile, me.role || 'user');
        }
      } catch (e) {
        console.warn('Failed to fetch /auth/me', e);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveAuthState = (user: User | null, profile: Profile | null, role: AppRole | null) => {
    if (user && profile && role) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, profile, role }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const getOrCreateProfile = (userId: string, email: string, name: string): Profile => {
    const profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '{}');
    if (profiles[userId]) {
      return profiles[userId];
    }
    const newProfile: Profile = {
      id: userId,
      user_id: userId,
      name,
      email,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    profiles[userId] = newProfile;
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    return newProfile;
  };

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const resp = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Login failed') };
      const token = json.data.token;
      const userObj = json.data.user || json.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      const newUser: User = { id: userObj._id || userObj.id, email: userObj.email };
      const userProfile: Profile = {
        id: userObj._id || userObj.id,
        user_id: userObj._id || userObj.id,
        name: userObj.name,
        email: userObj.email,
        avatar_url: userObj.avatar_url || null,
        created_at: userObj.createdAt,
        updated_at: userObj.updatedAt,
      };
      setUser(newUser);
      setProfile(userProfile);
      setRole(userObj.role || 'user');
      saveAuthState(newUser, userProfile, userObj.role || 'user');
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error: Error | null }> => {
    try {
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const resp = await fetch(`${api}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Registration failed') };
      const token = json.data.token;
      const userObj = json.data.user || json.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      const newUser: User = { id: userObj._id || userObj.id, email: userObj.email };
      const userProfile: Profile = {
        id: userObj._id || userObj.id,
        user_id: userObj._id || userObj.id,
        name: userObj.name,
        email: userObj.email,
        avatar_url: userObj.avatar_url || null,
        created_at: userObj.createdAt,
        updated_at: userObj.updatedAt,
      };
      setUser(newUser);
      setProfile(userProfile);
      setRole(userObj.role || 'user');
      saveAuthState(newUser, userProfile, userObj.role || 'user');
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        await fetch(`${api}/auth/logout`, { headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (e) {}
    setUser(null);
    setProfile(null);
    setRole(null);
    saveAuthState(null, null, null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const api = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const resp = await fetch(`${api}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Update failed') };
      const me = json.data;
      const updatedProfile: Profile = {
        id: me._id,
        user_id: me._id,
        name: me.name,
        email: me.email,
        avatar_url: me.avatar_url || null,
        created_at: me.createdAt,
        updated_at: me.updatedAt,
      };
      setProfile(updatedProfile);
      saveAuthState(user, updatedProfile, me.role || role);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '{}');
    if (profiles[user.id]) {
      setProfile(profiles[user.id]);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session: null,
      profile, 
      role, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      updateProfile,
      refreshProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
