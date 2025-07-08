"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AuthForm from "@/components/AuthForm";
import Image from 'next/image';

// Placeholder for user role check (replace with real auth/session logic)
const isAdmin = true; // TODO: Replace with actual admin check

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "?";
  return nameOrEmail
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

interface UserType {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
}

interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // User dropdown state
  const [user, setUser] = useState<UserType | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("my_users")
        .select("id, email, first_name, last_name, role, created_at, last_sign_in_at");
      if (!error) setUsers(data || []);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setUserLoading(false);
    }
    fetchUser();
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    const { error } = await supabase
      .from("my_users")
      .update({ role: newRole })
      .eq("id", userId);
    if (!error) {
      setUsers(users =>
        users.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      alert("Role updated!");
    } else {
      alert("Failed to update role");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    const { error } = await supabase
      .from("my_users")
      .delete()
      .eq("id", userId);
    if (!error) {
      setUsers(users => users.filter(u => u.id !== userId));
      alert("User deleted!");
    } else {
      alert("Failed to delete user");
    }
  }

  // Filter users by search
  const filteredUsers = users.filter(user => {
    const q = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(q) ||
      user.first_name?.toLowerCase().includes(q) ||
      user.last_name?.toLowerCase().includes(q)
    );
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-blue-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Access Denied</h1>
        <p className="text-blue-700 dark:text-blue-100">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8">Loading users...</div>;

  if (!userLoading && !user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 p-0">
      {/* Logo and Title + User Dropdown */}
      <nav className="w-full bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 shadow-sm flex items-center justify-between px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="rounded-full w-10 h-10 flex items-center justify-center shadow overflow-hidden bg-white dark:bg-gray-700">
            <Image src="/chat-logo.png" alt="twilioSMS Dashboard Logo" width={40} height={40} className="w-10 h-10 object-cover" />
          </div>
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-blue-700 dark:text-blue-100">twilio</span>
            <span className="text-green-500">SMS</span>
            <span className="text-blue-700 dark:text-blue-100"> Admin Panel</span>
          </span>
        </div>
        {/* User Dropdown */}
        <div className="relative">
          {userLoading ? (
            <div className="w-9 h-9 bg-blue-100 dark:bg-gray-600 rounded-full animate-pulse" />
          ) : user ? (
            <button
              className="flex items-center gap-2 focus:outline-none"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <div className="bg-blue-100 dark:bg-gray-600 text-blue-700 dark:text-blue-100 rounded-full w-9 h-9 flex items-center justify-center font-semibold text-base">
                {getInitials(user.user_metadata?.name || user.user_metadata?.full_name || user.email || "")}
              </div>
              <span className="hidden sm:block text-blue-700 font-medium">
                {user.user_metadata?.name || user.user_metadata?.full_name || user.email}
              </span>
              <svg className="w-4 h-4 text-blue-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
          ) : null}
          {dropdownOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 text-blue-700 dark:text-blue-100 font-semibold">
                {user.user_metadata?.name || user.user_metadata?.full_name || user.email}
              </div>
              <div className="px-4 py-1 text-xs text-blue-400 dark:text-blue-300">{user.email}</div>
              <hr className="my-1 border-blue-50 dark:border-gray-700" />
              <button
                className="w-full text-left px-4 py-2 text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition rounded-b-xl disabled:opacity-60"
                onClick={async () => {
                  setLogoutLoading(true);
                  await supabase.auth.signOut();
                  setDropdownOpen(false);
                  setLogoutLoading(false);
                  window.location.href = "/";
                }}
                disabled={logoutLoading}
              >
                {logoutLoading ? "Logging out…" : "Logout"}
              </button>
            </div>
          )}
        </div>
      </nav>
      <div className="flex justify-center mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-4xl border border-blue-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-green-600 dark:text-green-200 mb-6 text-center">User Management</h2>
          {/* Search input */}
          <div className="flex justify-end mb-4">
            <input
              type="text"
              placeholder="Search by name or email..."
              className="rounded-full border border-blue-200 dark:border-gray-700 px-4 py-2 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm transition w-72"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-50 dark:bg-gray-900">
                <th className="py-2 text-blue-700 dark:text-blue-100">User</th>
                <th className="py-2 text-blue-700 dark:text-blue-100">Name</th>
                <th className="py-2 text-blue-700 dark:text-blue-100">Role</th>
                <th className="py-2 text-blue-700 dark:text-blue-100">Created</th>
                <th className="py-2 text-blue-700 dark:text-blue-100">Last Sign In</th>
                <th className="py-2 text-blue-700 dark:text-blue-100">Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t border-green-200 dark:border-green-700 hover:bg-blue-50 dark:hover:bg-gray-700 transition">
                  <td className="py-2 flex items-center gap-2">
                    <Image src="/green-avatar.png" alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full shadow object-cover" />
                    <span className="font-semibold text-green-700 dark:text-green-400">{user.email}</span>
                  </td>
                  <td className="py-2 text-blue-700 dark:text-blue-100">{user.first_name} {user.last_name}</td>
                  <td className="py-2">
                    <select
                      value={user.role || "user"}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className="border rounded px-2 py-1 bg-blue-50 dark:bg-gray-900 text-blue-700 dark:text-blue-100"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-2 text-xs text-blue-400">{user.created_at ? new Date(user.created_at).toLocaleString() : ""}</td>
                  <td className="py-2 text-xs text-blue-400">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : ""}</td>
                  <td className="py-2">
                    <button
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 