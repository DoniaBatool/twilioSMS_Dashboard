"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UserType {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string; first_name?: string; last_name?: string };
  created_at?: string;
  last_sign_in_at?: string;
  // ...add other fields as needed
}

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"sign-in" | "sign-up">("sign-in");
  const [user, setUser] = useState<UserType | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Helper function to upsert user in my_users
  async function upsertMyUsers(user: UserType | null) {
    if (!user) return;
    await supabase.from('my_users').upsert({
      id: user.id,
      first_name: user.user_metadata?.first_name || "",
      last_name: user.user_metadata?.last_name || "",
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    });
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (view === "sign-in") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else {
        setUser(data.user);
        await upsertMyUsers(data.user);
        window.location.reload();
      }
    } else {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: displayName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (error) setError(error.message);
      else {
        setUser(data.user);
        await upsertMyUsers(data.user);
        window.location.reload();
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  };

  // iMessage-like styling: rounded, soft blue/gray, shadow, chat bubble look
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-sm border border-blue-100">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 text-center">
          {view === "sign-in" ? "Sign In" : "Sign Up"}
        </h2>
        {user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-blue-100 text-blue-700 rounded-2xl px-4 py-2 text-center shadow-inner">
              Signed in as <span className="font-semibold">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2 font-semibold shadow transition"
              disabled={loading}
            >
              {loading ? "Signing out..." : "Sign Out"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {view === "sign-up" && (
              <>
                <input
                  type="text"
                  placeholder="First Name"
                  className="rounded-full px-4 py-2 border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50 text-blue-900 shadow-inner"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="rounded-full px-4 py-2 border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50 text-blue-900 shadow-inner"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </>
            )}
            <input
              type="email"
              placeholder="Email"
              className="rounded-full px-4 py-2 border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50 text-blue-900 shadow-inner"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="rounded-full px-4 py-2 border border-blue-200 focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50 text-blue-900 shadow-inner"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            {error && (
              <div className="bg-red-100 text-red-700 rounded-2xl px-4 py-2 text-center shadow-inner">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2 font-semibold shadow transition"
              disabled={loading}
            >
              {loading ? (view === "sign-in" ? "Signing in..." : "Signing up...") : (view === "sign-in" ? "Sign In" : "Sign Up")}
            </button>
            <div className="text-center mt-2">
              {view === "sign-in" ? (
                <span>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline font-semibold"
                    onClick={() => setView("sign-up")}
                  >
                    Sign Up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline font-semibold"
                    onClick={() => setView("sign-in")}
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 