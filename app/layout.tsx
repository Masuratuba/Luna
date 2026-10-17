import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA 0.2",
  description: "Personal AI Assistant",
  applicationName: "LUNA",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/luna-icon.svg", type: "image/svg+xml" }],
    apple: "/icons/luna-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b18",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
