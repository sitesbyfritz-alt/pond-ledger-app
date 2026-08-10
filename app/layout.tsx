import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "PondLedger",
  description: "Know what a kilo of fish is costing you — in real time.",
  manifest: "/manifest.webmanifest",
  applicationName: "PondLedger",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PondLedger" },
};

export const viewport: Viewport = {
  themeColor: "#0A0E14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // dark-first; the theme toggle add/removes the `dark` class. The inline script
    // below applies the saved theme before paint to avoid a flash of the wrong theme.
    <html
      lang="en"
      className={`dark ${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pl-theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
