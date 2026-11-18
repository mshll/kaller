import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const allo = localFont({
  src: "../node_modules/allo-font/fonts/webfonts/AlloVariableFriendly.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-allo",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://kaller.mshl.me"),
  alternates: { canonical: "/" },
  title: "Kaller",
  description: "Look up who owns a Kuwaiti phone number, or find a number by name.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kaller",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon-v2.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f3f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={allo.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
