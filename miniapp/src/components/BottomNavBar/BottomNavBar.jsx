"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNavBar.module.css";
import { CircleUser, ScanFace, ToolCase } from "lucide-react";
import { useEffect, useState } from "react";
import { clientSupabase as supabase } from "../../../lib/supabase-client";

export default function BottomNavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    // Слушаем изменения авторизации
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
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Базовые элементы навигации для авторизованных пользователей
  const authNavItems = [
    { name: "Главная", href: "/main", Icon: ToolCase },
    { name: "Профиль", href: user ? `/profile/${user.id}` : "/auth", Icon: CircleUser },
  ];

  // Элементы навигации для неавторизованных пользователей
  const unauthNavItems = [
    { name: "Главная", href: "/", Icon: ToolCase },
    { name: "Вход", href: "/auth", Icon: ScanFace },
  ];

  const navItems = user ? authNavItems : unauthNavItems;

  // Не показываем навбар на странице авторизации
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