"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clientSupabase as supabase } from "./../../lib/supabase-client";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        router.replace('/main');
      } else {
        router.replace('/auth');
      }
      
    } catch (error) {
      router.replace('/auth');
    } finally {
      setLoading(false);
    }
  };

  return null;
}