"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function TestSupabase() {
  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from("sms_logs").select("*");
      console.log("Test data:", data, "Error:", error);
    }
    testConnection();
  }, []);

  return <div>Supabase connection test (check console)</div>;
}