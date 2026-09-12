import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA 0.2",
  description: "Personal AI Assistant",
  applicationName: "LUNA",
  manifest: "/manifest.webmanifest",
  themeColor: "#070b18",
  icons: {
    icon: [
      { url: "/icons/luna-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/luna-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/luna-180.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
