import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppRole, Profile } from '@/types/database';

// Helper function to decode JWT token
function decodeJWT(token: string): { id: string; email: string; role: AppRole } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.id,
      email: payload.email,
      role: payload.role || 'user',
    };
  } catch (e) {
    console.warn('Failed to decode JWT', e);
    return null;
  }
}

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
    // Try to load token and decode user info from JWT
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    // Try to restore from saved auth state first
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      try {
        const { user: savedUser, profile: savedProfile, role: savedRole } = JSON.parse(savedAuth);
        if (savedUser && savedProfile && savedRole) {
          setUser(savedUser);
          setProfile(savedProfile);
          setRole(savedRole);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved auth state', e);
      }
    }

    // Decode JWT to get user info
    const decoded = decodeJWT(token);
    if (!decoded) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setLoading(false);
      return;
    }

    const newUser: User = { id: decoded.id, email: decoded.email };
    // Create a minimal profile from JWT data
    const userProfile: Profile = {
      id: decoded.id,
      user_id: decoded.id,
      name: decoded.email.split('@')[0], // Use email prefix as name fallback
      email: decoded.email,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(newUser);
    setProfile(userProfile);
    setRole(decoded.role);
    saveAuthState(newUser, userProfile, decoded.role);
    setLoading(false);
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
      const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
      const resp = await fetch(`${api}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Login failed') };
      const token = json.data.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Decode JWT to get user info since backend only returns token
      const decoded = decodeJWT(token);
      if (!decoded) return { error: new Error('Failed to decode token') };

      const newUser: User = { id: decoded.id, email: decoded.email };
      const userProfile: Profile = {
        id: decoded.id,
        user_id: decoded.id,
        name: email.split('@')[0], // Use email prefix as name
        email: decoded.email,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUser(newUser);
      setProfile(userProfile);
      setRole(decoded.role);
      saveAuthState(newUser, userProfile, decoded.role);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error: Error | null }> => {
    try {
      const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
      const resp = await fetch(`${api}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Registration failed') };

      // Backend returns user data directly on register
      const userObj = json.data;
      const userId = userObj._id || userObj.id;

      // After registration, login to get token
      const loginResp = await fetch(`${api}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const loginJson = await loginResp.json();
      if (!loginResp.ok || !loginJson.success) {
        return { error: new Error('Registration successful but login failed. Please sign in.') };
      }

      const token = loginJson.data.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      const newUser: User = { id: userId, email: userObj.email };
      const userProfile: Profile = {
        id: userId,
        user_id: userId,
        name: userObj.name || name,
        email: userObj.email,
        avatar_url: userObj.profile_img || null,
        created_at: userObj.createdAt,
        updated_at: userObj.updatedAt,
      };
      const userRole = userObj.role || 'user';
      setUser(newUser);
      setProfile(userProfile);
      setRole(userRole);
      saveAuthState(newUser, userProfile, userRole);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    // Backend doesn't have a logout endpoint, just clear local state
    setUser(null);
    setProfile(null);
    setRole(null);
    saveAuthState(null, null, null);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('Not authenticated') };
    try {
      const api = import.meta.env.VITE_API_URL || 'https://iitd-dev.vercel.app';
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      const resp = await fetch(`${api}/api/user/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: data.name,
          password: (data as any).password,
        }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.success) return { error: new Error(json.message || 'Update failed') };
      const me = json.data;
      const updatedProfile: Profile = {
        id: me._id,
        user_id: me._id,
        name: me.name,
        email: me.email,
        avatar_url: me.profile_img || null,
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
