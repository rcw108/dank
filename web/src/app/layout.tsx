import type { Metadata, Viewport } from "next";
import { Poppins, Sora } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";

// Same families as dank.capital: Sora for headings, Poppins for body text.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "DANK Capital",
    template: "%s · DANK Capital",
  },
  description: "Your DANK Capital investor account on your phone.",
  applicationName: "DANK Capital",
  appleWebApp: {
    capable: true,
    title: "DANK Capital",
    statusBarStyle: "black-translucent",
  },
  // Account figures must never turn into tappable phone numbers on iOS.
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: "DANK Capital",
    title: "DANK Capital",
    description: "Your DANK Capital investor account on your phone.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d232b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col bg-bg text-fg">{children}</body>
    </html>
  );
}
