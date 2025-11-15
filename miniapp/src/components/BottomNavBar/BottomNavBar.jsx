"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNavBar.module.css";
import { CircleUser, ScanFace, ToolCase, Calendar, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

export default function BottomNavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const authNavItems = [
    { name: "Главная", href: "/main", Icon: ToolCase },
    { name: "Расписание", href: "/schedule/week", Icon: Calendar },
    { name: "Дашборд", href: "/UniversityDashboard", Icon: LayoutDashboard },
    { name: "Профиль", href: user ? `/profile/${user.id}` : "/auth", Icon: CircleUser },
  ];

  const unauthNavItems = [
    { name: "Главная", href: "/", Icon: ToolCase },
    { name: "Вход", href: "/auth", Icon: ScanFace },
  ];

  const navItems = user ? authNavItems : unauthNavItems;

  if (pathname === '/auth' || loading) {
    return null;
  }

  return (
    <nav className={styles.navBar}>
      {navItems.map(({ name, href, Icon }) => {
        const isActive = pathname === href || (name === "Профиль" && pathname.startsWith("/profile/"));
        return (
          <Link key={name} href={href} className={styles.navLink}>
            <div
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
            >
              <Icon className={styles.icon} />
              <span className={styles.label}>{name}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}