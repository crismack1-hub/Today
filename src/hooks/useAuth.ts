import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../lib/supabase';

export function useAuth(): { user: User | null; loading: boolean; enabled: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabaseEnabled);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, enabled: supabaseEnabled };
}
