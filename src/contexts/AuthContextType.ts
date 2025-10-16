import { createContext } from 'react';
import type { AuthUser } from '../lib/auth';
import type { Session } from '@supabase/supabase-js';

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

