import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  initializeAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isInitialized: false,
  setUser: (user) => set({ user }),
  initializeAuth: async () => {
    try {
      // Check active session
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      set({ user, isInitialized: true, isLoading: false });

      if (user && user.email) {
        // Sync profile to database
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          updated_at: new Date().toISOString()
        });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const currentUser = session?.user ?? null;
        set({ user: currentUser });
        if (currentUser && currentUser.email) {
          // Sync profile to database
          await supabase.from('profiles').upsert({
            id: currentUser.id,
            email: currentUser.email,
            updated_at: new Date().toISOString()
          });
        }
      });
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isInitialized: true, isLoading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));
