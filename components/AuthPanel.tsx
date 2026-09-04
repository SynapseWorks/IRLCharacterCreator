"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

type AuthPanelProps = {
  onUserChange?: (user: User | null) => void;
};

export function AuthPanel({ onUserChange }: AuthPanelProps) {
  const configured = isSupabaseConfigured();
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      onUserChange?.(data.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      onUserChange?.(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [onUserChange, supabase]);

  async function requestMagicLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;

    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setMessage("Magic link sent. Check your email, then return here.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
    setBusy(false);
  }

  if (!configured || !supabase) {
    return (
      <section className="auth-panel auth-panel-muted">
        <div>
          <strong>Guest prototype</strong>
          <span>Add the Supabase environment variables to enable accounts and cloud saves.</span>
        </div>
      </section>
    );
  }

  if (user) {
    return (
      <section className="auth-panel">
        <div>
          <strong>Cloud save on</strong>
          <span>{user.email ?? "Signed in"}</span>
        </div>
        <button className="secondary-button" onClick={signOut} disabled={busy}>Sign out</button>
      </section>
    );
  }

  return (
    <section className="auth-panel">
      <div>
        <strong>Save your character</strong>
        <span>Sign in with a magic link. No password needed.</span>
      </div>
      <form className="auth-form" onSubmit={requestMagicLink}>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        <button className="secondary-button" disabled={busy}>{busy ? "Sending…" : "Email me a magic link"}</button>
      </form>
      {message && <small className="auth-message">{message}</small>}
    </section>
  );
}
