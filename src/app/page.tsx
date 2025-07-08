"use client";
import { useState, useEffect } from "react";
import ConversationList from "@/components/ConversationList";
import ThreadView from "@/components/ThreadView";
import Navbar from '@/components/Navbar';
import { supabase } from "@/lib/supabaseClient";
import AuthForm from "@/components/AuthForm";

export default function Home() {
  const [selectedThread, setSelectedThread] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAndRole() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }
      const { data: userProfile } = await supabase
        .from('my_users')
        .select('role')
        .eq('id', user.id)
        .single();
      setRole(userProfile?.role ?? null);
      setLoading(false);
    }
    fetchUserAndRole();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <AuthForm />;

  // Close sidebar on mobile when a conversation is selected
  function handleSelectThread(thread: any) {
    setSelectedThread(thread);
    setSidebarOpen(false);
  }

  return (
    <>
      <Navbar user={user} role={role} selectedThread={selectedThread} toggleSidebar={() => setSidebarOpen(v => !v)} isSidebarOpen={isSidebarOpen} />
      <div className="flex h-screen">
        <ConversationList
          onSelect={handleSelectThread}
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={() => setSidebarOpen(v => !v)}
        />
        {selectedThread ? (
          <ThreadView threadId={selectedThread.id} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-blue-50 text-blue-400 text-xl">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </>
  );
}
