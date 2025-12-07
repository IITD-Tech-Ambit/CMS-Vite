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
const PROFILES_STORAGE_KEY = 'magazine_profiles';
const REGISTERED_USERS_KEY = 'registered_users';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const { user: storedUser, profile: storedProfile, role: storedRole } = JSON.parse(stored);
        setUser(storedUser);
        setProfile(storedProfile);
        setRole(storedRole);
      } catch (e) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
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
    const mockUser = MOCK_USERS[email.toLowerCase()];
    
    // Also check registered users
    const registeredUsers = JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || '{}');
    const registeredUser = registeredUsers[email.toLowerCase()];

    if (mockUser && mockUser.password === password) {
      const userId = `user_${email.replace(/[^a-z0-9]/gi, '_')}`;
      const newUser: User = { id: userId, email };
      const userProfile = getOrCreateProfile(userId, email, mockUser.name);
      
      setUser(newUser);
      setProfile(userProfile);
      setRole(mockUser.role);
      saveAuthState(newUser, userProfile, mockUser.role);
      return { error: null };
    } else if (registeredUser && registeredUser.password === password) {
      const userId = registeredUser.id;
      const newUser: User = { id: userId, email };
      const userProfile = getOrCreateProfile(userId, email, registeredUser.name);
      
      setUser(newUser);
      setProfile(userProfile);
      setRole('user');
      saveAuthState(newUser, userProfile, 'user');
      return { error: null };
    }
    
    return { error: new Error('Invalid email or password') };
  };

  const signUp = async (email: string, password: string, name: string): Promise<{ error: Error | null }> => {
    const registeredUsers = JSON.parse(localStorage.getItem(REGISTERED_USERS_KEY) || '{}');
    
    if (MOCK_USERS[email.toLowerCase()] || registeredUsers[email.toLowerCase()]) {
      return { error: new Error('User already exists') };
    }

    const userId = `user_${Date.now()}`;
    registeredUsers[email.toLowerCase()] = { id: userId, password, name };
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));

    const newUser: User = { id: userId, email };
    const userProfile = getOrCreateProfile(userId, email, name);
    
    setUser(newUser);
    setProfile(userProfile);
    setRole('user');
    saveAuthState(newUser, userProfile, 'user');
    
    return { error: null };
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    setRole(null);
    saveAuthState(null, null, null);
  };

  const updateProfile = async (data: Partial<Profile>): Promise<{ error: Error | null }> => {
    if (!user || !profile) {
      return { error: new Error('Not authenticated') };
    }

    const profiles = JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '{}');
    const updatedProfile = { ...profile, ...data, updated_at: new Date().toISOString() };
    profiles[user.id] = updatedProfile;
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    
    setProfile(updatedProfile);
    saveAuthState(user, updatedProfile, role);
    
    return { error: null };
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
