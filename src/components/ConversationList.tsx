"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from 'next/image';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Thread {
  id: string;
  from_number: string;
  to_number: string;
  status_role: string;
  created_at: string;
  update_at: string;
}

interface LatestMessage {
  thread_id: string;
  content: string;
  event_time: string;
}

export default function ConversationList({ onSelect, isSidebarOpen, toggleSidebar }: { onSelect?: (thread: Thread) => void, isSidebarOpen?: boolean, toggleSidebar?: () => void }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [latestMessages, setLatestMessages] = useState<Record<string, LatestMessage>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [phoneSearch, setPhoneSearch] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    async function fetchThreadsAndMessages() {
      setLoading(true);
      setError(null);
      let query = supabase
        .from("threads_table")
        .select("id, from_number, to_number, status_role, created_at, update_at")
        .order("update_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status_role", statusFilter);
      }
      if (phoneSearch) {
        query = query.ilike("from_number", `%${phoneSearch}%`);
      }
      if (fromDate) {
        query = query.gte("update_at", fromDate);
      }
      if (toDate) {
        // Add 1 day to include the end date fully
        const toDateObj = new Date(toDate);
        toDateObj.setDate(toDateObj.getDate() + 1);
        query = query.lt("update_at", toDateObj.toISOString().slice(0, 10));
      }
      const { data: threadsData, error } = await query;
      console.log("Fetched threads:", threadsData, "Error:", error);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setThreads(threadsData || []);
      // Fetch latest message for each thread
      if (threadsData && threadsData.length > 0) {
        const messages: Record<string, LatestMessage> = {};
        await Promise.all(
          threadsData.map(async (thread: Thread) => {
            const { data: msgData } = await supabase
              .from("sms_logs")
              .select('id, thread_id, lead_user_message, "AI_Agent_Reply", "Manual_Agent_Reply", event_time')
              .eq("thread_id", thread.id)
              .order("event_time", { ascending: false })
              .limit(1);
            if (msgData && msgData.length > 0) {
              const msg = msgData[0];
              // Prefer Manual_Agent_Reply > AI_Agent_Reply > lead_user_message
              const content = msg["Manual_Agent_Reply"] || msg["AI_Agent_Reply"] || msg.lead_user_message || "";
              messages[thread.id] = {
                thread_id: thread.id,
                content,
                event_time: msg.event_time,
              };
            }
          })
        );
        setLatestMessages(messages);
      }
      setLoading(false);
    }
    fetchThreadsAndMessages();

    // Realtime subscription for threads_table and sms_logs
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    const threadsSub = supabase
      .channel('realtime-threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads_table' }, () => {
        fetchThreadsAndMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_logs' }, () => {
        fetchThreadsAndMessages();
      })
      .subscribe();
    subscriptionRef.current = threadsSub;
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [statusFilter, phoneSearch, fromDate, toDate]);

  return (
    <div
      className={
        `w-full max-w-xs bg-white dark:bg-gray-800 border-r border-blue-100 dark:border-gray-700 h-screen overflow-y-auto shadow-xl
        fixed top-0 left-0 z-40 transition-transform duration-300 md:static md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:block`
      }
      style={{ minWidth: '260px' }}
    >
      {/* Mobile close button */}
      <div className="md:hidden flex justify-end p-2">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-gray-700"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        >
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 px-4 py-2 flex flex-col gap-2 shadow-sm">
        <h2 className="text-xl font-bold text-blue-600 mb-1">Conversations</h2>
        <div className="flex gap-2 items-center w-full">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              className="appearance-none rounded-full border border-blue-200 dark:border-gray-700 px-3 py-1.5 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm transition w-[110px] ring-0 text-sm"
              title="Filter by status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="ai_responded">AI-Agent</option>
              <option value="manual">Manual</option>
              <option value="failed">Failed</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 text-xs">
              ▼
            </span>
          </div>
          {/* Phone Search */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search phone…"
              className="rounded-full border border-blue-200 dark:border-gray-700 pl-9 pr-4 py-1.5 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm transition w-full text-sm"
              value={phoneSearch}
              onChange={e => setPhoneSearch(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300 text-base pointer-events-none">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/></svg>
            </span>
          </div>
        </div>
        <div className="flex gap-1 items-center bg-blue-50 dark:bg-gray-900 rounded-full px-5 py-1 border border-blue-100 dark:border-gray-700 shadow-sm w-full">
          <input
            type="date"
            className="rounded-full border border-blue-200 dark:border-gray-700 px-2 py-1 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm transition text-xs w-[110px]"
            value={fromDate || ""}
            onChange={e => setFromDate(e.target.value)}
            title="From date"
          />
          <span className="text-blue-300 text-xs px-1">–</span>
          <input
            type="date"
            className="rounded-full border border-blue-200 dark:border-gray-700 px-2 py-1 text-blue-700 dark:text-blue-100 bg-blue-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400 outline-none shadow-sm transition text-xs w-[110px]"
            value={toDate || ""}
            onChange={e => setToDate(e.target.value)}
            title="To date"
          />
        </div>
      </div>
      {loading && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && <div className="p-4 text-red-500">{error}</div>}
      <ul className="divide-y divide-blue-50">
        {threads.length === 0 && !loading && !error && (
          <div className="p-8 text-center text-gray-400 italic">
            No conversations found.
          </div>
        )}
        {threads.map(thread => (
          <li
            key={thread.id}
            className="p-4 hover:bg-blue-50 cursor-pointer transition flex flex-row items-center gap-3"
            onClick={() => onSelect?.(thread)}
          >
            {/* Avatar */}
            <Image
              src="/blue-avatar.png"
              alt="Avatar"
              width={36}
              height={36}
              className="flex-shrink-0 w-9 h-9 rounded-full shadow object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-700">{thread.from_number}</span>
                <span className="text-xs text-blue-400">{thread.status_role}</span>
              </div>
              <div className="text-xs text-blue-500">To: {thread.to_number}</div>
              {/* Show latest message if available */}
              <div className="text-sm text-gray-400 italic truncate">
                {latestMessages[thread.id]?.content || "No messages yet."}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
} 