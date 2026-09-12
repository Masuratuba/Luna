import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUNA 0.2",
  description: "Personal AI Assistant",
  applicationName: "LUNA",
  manifest: "/manifest.webmanifest",
  themeColor: "#070b18",
  icons: {
    icon: [{ url: "/icons/luna-icon.svg", type: "image/svg+xml" }],
    apple: "/icons/luna-icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
