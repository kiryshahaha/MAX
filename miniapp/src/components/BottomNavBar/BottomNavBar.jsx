"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./BottomNavBar.module.css";
import { CircleUser, ScanFace, ToolCase } from "lucide-react";

const navItems = [
  { name: "Главная", href: "/main", Icon: ToolCase },
  { name: "Вход", href: "/auth", Icon: ScanFace },
  { name: "Профиль", href: "/profile/50384", Icon: CircleUser },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.navBar}>
      {navItems.map(({ name, href, Icon }) => {
        const isActive = pathname === href;
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
