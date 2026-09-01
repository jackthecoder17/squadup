import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "squadup",
    template: "%s · squadup",
  },
  description: "Matchmaking for people, not lobbies. Find players, form squads, queue up.",
  openGraph: {
    title: "squadup",
    description: "Matchmaking for people, not lobbies.",
    type: "website",
  },
};

// Set the theme before first paint so there's no flash.
const themeScript = `
try {
  var t = localStorage.getItem("theme");
  if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-foreground flex min-h-full flex-col">{children}</body>
    </html>
  );
}
