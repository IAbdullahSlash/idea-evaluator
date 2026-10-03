import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Kalam } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/ThemeProvider"

// The examiner's hand: used only for scores and short margin marks.
const hand = Kalam({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-hand",
  display: "swap",
})

export const metadata: Metadata = {
  title: "The Idea Evaluator: an honest mark for your project idea",
  description:
    "Write down your project idea and get it marked honestly: a feasibility score, the real risks, and a plan sized to your skills and deadline.",
  keywords: ["project idea", "feasibility", "final year project", "hackathon", "project planning"],
  openGraph: {
    title: "The Idea Evaluator",
    description: "Write down your project idea and get it marked honestly, then planned.",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F1F2F4" },
    { media: "(prefers-color-scheme: dark)", color: "#111419" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${hand.variable}`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
