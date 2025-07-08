"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: number;
  thread_id: string;
  from_number: string;
  to_number: string;
  lead_user_message: string | null;
  AI_Agent_Reply: string | null;
  Manual_Agent_Reply: string | null;
  sender_type: string | null;
  event_time: string;
}

interface FormattedMessage extends Message {
  formattedTime: string;
}

export default function ThreadView({ threadId }: { threadId: string }) {
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [toNumber, setToNumber] = useState<string | null>(null);
  const [threadStatus, setThreadStatus] = useState<string>("");
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("sms_logs")
        .select("id, thread_id, from_number, to_number, lead_user_message, \"AI_Agent_Reply\", \"Manual_Agent_Reply\", sender_type, event_time")
        .eq("thread_id", threadId)
        .order("event_time", { ascending: true });
      if (error) setError(error.message);
      else {
        // Format dates on the client only
        const formatted = (data || []).map((msg) => ({
          ...msg,
          formattedTime: typeof window !== 'undefined' && msg.event_time ? new Date(msg.event_time).toLocaleString() : "",
        }));
        setMessages(formatted);
      }
      setLoading(false);
    }
    if (threadId) fetchMessages();

    // Realtime subscription for sms_logs (current thread only)
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    const threadSub = supabase
      .channel('realtime-thread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sms_logs', filter: `thread_id=eq.${threadId}` }, () => {
        fetchMessages();
      })
      .subscribe();
    subscriptionRef.current = threadSub;
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [threadId]);

  // Fetch thread info and status when threadId changes
  useEffect(() => {
    async function fetchThreadInfo() {
      if (!threadId) return;
      const { data, error } = await supabase
        .from("threads_table")
        .select("from_number, to_number, status_role")
        .eq("id", threadId)
        .single();
      if (!error && data) {
        setFromNumber(data.from_number);
        setToNumber(data.to_number);
        setThreadStatus(data.status_role || "");
      } else {
        setFromNumber(null);
        setToNumber(null);
        setThreadStatus("");
      }
    }
    fetchThreadInfo();
  }, [threadId]);

  function getMessageContent(msg: FormattedMessage) {
    // Prefer Manual_Agent_Reply > AI_Agent_Reply > lead_user_message
    return msg.Manual_Agent_Reply || msg.AI_Agent_Reply || msg.lead_user_message || "";
  }

  function getSenderLabel(msg: FormattedMessage) {
    if (msg.sender_type?.toLowerCase() === "agent" || msg.sender_type?.toLowerCase() === "manual agent") return "Manual Agent";
    if (msg.sender_type?.toLowerCase() === "ai") return "AI Agent";
    return "Lead";
  }

  // Helper to get initials for avatars
  function getAvatarInitials(msg: FormattedMessage) {
    if (msg.sender_type?.toLowerCase() === "ai") return "AI";
    if (msg.sender_type?.toLowerCase().includes("agent")) return "MA";
    // For lead, always show 'LD'
    return "LD";
  }

  function getAvatarColor(msg: FormattedMessage) {
    if (msg.sender_type?.toLowerCase() === "ai") return "bg-blue-200 text-blue-700";
    if (msg.sender_type?.toLowerCase().includes("agent")) return "bg-green-200 text-green-700";
    return "bg-gray-200 text-gray-700";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !fromNumber || !toNumber) return;
    setSending(true);
    setError(null);
    // Insert as Manual Agent reply
    const { error } = await supabase.from("sms_logs").insert([
      {
        thread_id: threadId,
        Manual_Agent_Reply: newMessage,
        sender_type: "manual agent",
        event_time: new Date().toISOString(),
        from_number: fromNumber,
        to_number: toNumber,
      },
    ]);
    if (error) setError(error.message);
    setNewMessage("");
    setSending(false);
  }

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from("threads_table")
        .update({ status_role: newStatus })
        .eq("id", threadId);
      if (error) throw error;
      setThreadStatus(newStatus);
      toast.success("Thread status updated!");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <div className="flex-1 h-screen bg-blue-50 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-blue-100 dark:border-gray-700 sticky top-0 bg-blue-50 dark:bg-gray-900 z-10">
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-100">Thread Messages</h2>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-blue-700 dark:text-blue-100 text-sm">Status:</span>
          <select
            value={threadStatus}
            onChange={handleStatusChange}
            disabled={statusLoading}
            className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100"
          >
            <option value="open">Open (active conversation)</option>
            <option value="closed">Closed (no further replies needed)</option>
            <option value="manual">Manual (requires human/agent intervention)</option>
            <option value="ai_responded">AI-Responded (AI handled)</option>
            <option value="failed">Failed (AI failed, needs attention)</option>
          </select>
          {statusLoading && <span className="ml-2 text-xs text-gray-500">Updating…</span>}
        </div>
      </div>
      {loading && (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      {error && <div className="p-4 text-red-500">{error}</div>}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && !error && (
          <div className="p-8 text-center text-gray-400 italic">
            No messages in this thread.
          </div>
        )}
        {messages.map((msg) => {
          const isLead = msg.sender_type?.toLowerCase() === "lead";
          const isAI = msg.sender_type?.toLowerCase() === "ai";
          return (
            <div key={msg.id} className="flex w-full gap-2 items-end">
              {/* Avatar on left for lead, right for agent/AI */}
              {isLead && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow ${getAvatarColor(msg)} ${isLead ? 'dark:bg-gray-700 dark:text-gray-200' : ''}`}>{getAvatarInitials(msg)}</div>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 shadow flex flex-col gap-1
                  ${isLead
                    ? "bg-white dark:bg-gray-800 self-start text-blue-900 dark:text-gray-100"
                    : isAI
                    ? "bg-blue-100 dark:bg-blue-900 self-end text-blue-700 dark:text-blue-100"
                    : "bg-green-100 dark:bg-green-900 self-end text-green-700 dark:text-green-100"}
                `}
              >
                <div className="text-xs font-semibold mb-1">
                  {getSenderLabel(msg)}
                  <span className="ml-2 text-[10px] text-gray-400">{msg.formattedTime}</span>
                </div>
                <div className="whitespace-pre-line">{getMessageContent(msg)}</div>
              </div>
              {!isLead && (
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow ${getAvatarColor(msg)} ${!isLead ? 'dark:bg-gray-700 dark:text-gray-200' : ''}`}>{getAvatarInitials(msg)}</div>
              )}
            </div>
          );
        })}
      </div>
      {/* Message Send Box */}
      <form
        onSubmit={handleSend}
        className="sticky bottom-0 bg-blue-50 dark:bg-gray-900 p-4 border-t border-blue-100 dark:border-gray-700 flex gap-2 items-center z-10"
        style={{ boxShadow: "0 -2px 8px 0 rgba(0,0,0,0.02)" }}
      >
        <input
          type="text"
          className="flex-1 rounded-full px-4 py-2 border border-blue-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-400 outline-none bg-white dark:bg-gray-800 text-blue-900 dark:text-gray-100 shadow-inner"
          placeholder={fromNumber && toNumber ? "Type your message…" : "Loading…"}
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          disabled={sending || !fromNumber || !toNumber}
          maxLength={1000}
          autoComplete="off"
        />
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-full px-6 py-2 font-semibold shadow transition disabled:opacity-50"
          disabled={sending || !newMessage.trim() || !fromNumber || !toNumber}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
} 