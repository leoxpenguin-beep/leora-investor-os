import type { Session, User } from "@supabase/supabase-js";
import React from "react";

import { supabase } from "./supabaseClient";

export function useSession(): {
  session: Session | null;
  user: User | null;
  loading: boolean;
} {
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    async function bootstrap() {
      if (!supabase) {
        if (!alive) return;
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;
        if (error) throw error;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      } catch {
        if (!alive) return;
        setSession(null);
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void bootstrap();

    if (!supabase) {
      return () => {
        alive = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

