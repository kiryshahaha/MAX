"use client";
import dynamic from "next/dynamic";
import "@maxhub/max-ui/dist/styles.css";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { App, ConfigProvider, theme } from "antd";
import { useEffect, useState } from "react";
import BottomNavBar from "@/components/BottomNavBar/BottomNavBar";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const MaxUI = dynamic(() => import("@maxhub/max-ui").then((mod) => mod.MaxUI), {
  ssr: false,
});

export default function RootLayout({ children }) {
  const [isDark, setIsDark] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark");
    setIsDark(media.matches);
    const handler = (e) => setIsDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  // Не показываем навбар на странице авторизации
  const showNavBar = pathname !== '/auth';

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <App>
          <ConfigProvider
            theme={{
              algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            }}
          >
            <MaxUI>
              {children}
              {showNavBar && <BottomNavBar />}
            </MaxUI>
          </ConfigProvider>
        </App>
      </body>
    </html>
  );
}