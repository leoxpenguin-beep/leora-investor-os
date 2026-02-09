import React from "react";
import type { Session, User } from "@supabase/supabase-js";

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
    if (!supabase) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    let alive = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        const next = data?.session ?? null;
        setSession(next);
        setUser(next?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!alive) return;
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}

