"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface UserType {
  id: string;
  email?: string;
  user_metadata?: { name?: string; full_name?: string };
}

interface Thread {
  id: string;
  from_number: string;
  to_number: string;
  status_role: string;
  created_at: string;
  update_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  from_number: string;
  to_number: string;
  lead_user_message?: string;
  AI_Agent_Reply?: string;
  Manual_Agent_Reply?: string;
  sender_type?: string;
  status_role?: string;
  delivery_status?: string;
  event_time?: string;
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "?";
  return nameOrEmail
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function ExportFormatModal({ open, onClose, onSelect }: { open: boolean, onClose: () => void, onSelect: (format: 'csv' | 'json') => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-80 flex flex-col items-center">
        <h3 className="text-lg font-bold mb-4 text-blue-700 dark:text-blue-100">Download as…</h3>
        <div className="flex gap-4 mb-4">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded-full shadow transition"
            onClick={() => onSelect('csv')}
          >
            CSV
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-full shadow transition"
            onClick={() => onSelect('json')}
          >
            JSON
          </button>
        </div>
        <button className="text-blue-400 hover:underline text-sm" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function polishMessagesForCSV(messages: Message[]) {
  // Only include key fields with friendly headers
  return messages.map((msg) => ({
    ID: msg.id,
    'Thread ID': msg.thread_id,
    From: msg.from_number,
    To: msg.to_number,
    'Message (Lead)': msg.lead_user_message,
    'AI Agent Reply': msg.AI_Agent_Reply,
    'Manual Agent Reply': msg.Manual_Agent_Reply,
    'Sender Type': msg.sender_type,
    'Status': msg.status_role,
    'Delivery Status': msg.delivery_status,
    'Timestamp': msg.event_time,
  }));
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(
    rows.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
  );
  return csv.join('\r\n');
}

export default function Navbar({ user, role, selectedThread, toggleSidebar }: {
  user?: UserType;
  role?: string | null;
  selectedThread?: Thread | null;
  toggleSidebar?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState<null | 'all' | 'current'>(null);

  // Name: Prefer user_metadata.name/full_name, fallback to email
  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "User";

  const initials = getInitials(
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email || ""
  );

  async function fetchAllMessages(): Promise<unknown[]> {
    // Fetch all messages for all threads
    const { data: messages, error } = await supabase
      .from('sms_logs')
      .select('*');
    if (error) throw new Error('Failed to fetch messages');
    return messages;
  }

  async function fetchCurrentThreadMessages(): Promise<unknown[]> {
    if (!selectedThread) return [];
    const { data: messages, error } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('thread_id', selectedThread.id);
    if (error) throw new Error('Failed to fetch messages for this thread');
    return messages;
  }

  async function handleExport(format: 'csv' | 'json', scope: 'all' | 'current') {
    setExporting(true);
    try {
      let messages: unknown[] = [];
      if (scope === 'all') {
        messages = await fetchAllMessages();
      } else {
        messages = await fetchCurrentThreadMessages();
      }
      if (format === 'csv') {
        const polished = polishMessagesForCSV(messages as Message[]);
        const csv = toCSV(polished);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = scope === 'all' ? 'all_conversations.csv' : `thread_${selectedThread?.id}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Exported as CSV!');
      } else {
        const json = JSON.stringify(messages, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = scope === 'all' ? 'all_conversations.json' : `thread_${selectedThread?.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Exported as JSON!');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || 'Export failed');
      } else {
        alert('Export failed');
      }
    }
    setExporting(false);
    setModalOpen(null);
    setDropdownOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <nav className="w-full bg-white dark:bg-gray-800 border-b border-blue-100 dark:border-gray-700 shadow-sm flex items-center justify-between px-6 py-2 sticky top-0 z-30">
      {/* Logo/Icon and Hamburger for mobile */}
      <div className="flex items-center gap-1">
        {/* Hamburger menu for mobile */}
        {toggleSidebar && (
          <button
            className="mr-2 flex md:hidden items-center justify-center w-9 h-9 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        )}
        <div className="rounded-full w-10 h-10 flex items-center justify-center shadow overflow-hidden bg-white dark:bg-gray-700">
          {/* Use provided chat bubble logo */}
          <Image src="/chat-logo.png" alt="twilioSMS Dashboard Logo" width={40} height={40} className="w-10 h-10 object-cover" />
        </div>
        <span className="text-xl font-bold tracking-tight">
          <span className="text-blue-700 dark:text-blue-100">twilio</span>
          <span className="text-green-500">SMS</span>
          <span className="text-blue-700 dark:text-blue-100"> Dashboard</span>
        </span>
      </div>
      {/* User Avatar/Dropdown */}
      <div className="relative">
        <button
          className="flex items-center gap-2 focus:outline-none"
          onClick={() => setDropdownOpen((v) => !v)}
        >
          <div className="bg-blue-100 dark:bg-gray-600 text-blue-700 dark:text-blue-100 rounded-full w-9 h-9 flex items-center justify-center font-semibold text-base">
            {initials}
          </div>
          <span className="hidden sm:block text-blue-700 font-medium">{displayName}</span>
          <svg className="w-4 h-4 text-blue-400 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
        {dropdownOpen && (
          <>
            <ExportFormatModal
              open={modalOpen !== null}
              onClose={() => setModalOpen(null)}
              onSelect={format => handleExport(format, modalOpen as 'all' | 'current')}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-blue-100 dark:border-gray-700 rounded-xl shadow-lg py-2 z-50">
              <div className="px-4 py-2 text-blue-700 dark:text-blue-100 font-semibold">{displayName}</div>
              <div className="px-4 py-1 text-xs text-blue-400 dark:text-blue-300">{user?.email}</div>
              <hr className="my-1 border-blue-50 dark:border-gray-700" />
              <button
                className="w-full text-left px-4 py-2 text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                onClick={() => setModalOpen('all')}
                disabled={exporting}
              >
                Export All
              </button>
              <button
                className="w-full text-left px-4 py-2 text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                onClick={() => setModalOpen('current')}
                disabled={exporting || !selectedThread}
              >
                Export Current Chat
              </button>
              {/* Admin Panel Link (only for admin) */}
              {role === 'admin' && (
                <a
                  href="/admin"
                  className="w-full block text-left px-4 py-2 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900 transition"
                >
                  Admin Panel
                </a>
              )}
              <button className="w-full text-left px-4 py-2 text-blue-600 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-700 transition rounded-b-xl" onClick={handleLogout}>Logout</button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
} 