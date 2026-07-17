import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Fリーグ試合情報",
  description: "Fリーグ（フットサル）F1・F2 試合情報・日程・順位表",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <NavBar />
        <main className="flex-1 max-w-2xl mx-auto w-full px-3 py-4">
          {children}
        </main>
        <footer className="text-center text-xs text-[var(--muted)] py-3 border-t border-[var(--border)]">
          データ出典: Fリーグ公式サイト
        </footer>
      </body>
    </html>
  );
}
