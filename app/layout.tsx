import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IRL Character Creator",
  description: "Upload yourself. Name your character. Equip your life.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
