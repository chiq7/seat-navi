import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { AnalyticsNavigationTracker } from "@/components/analytics/AnalyticsNavigationTracker";
import { VerificationNotice } from "@/components/analytics/VerificationNotice";
import { gaBootstrapScript } from "@/lib/analyticsTraffic";
import Footer from "@/components/common/Footer";
import { buildSiteStructuredData, serializeJsonLd } from "@/lib/structuredData";
import { HOME_DESCRIPTION as SITE_DESCRIPTION, HOME_TITLE as SITE_TITLE, SITE_NAME } from "@/lib/metadata";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  applicationName: SITE_NAME,
  metadataBase: new URL("https://tixrepo.com"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "https://tixrepo.com",
  },
  icons: {
    icon: [
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon.ico", type: "image/x-icon", sizes: "64x64" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  verification: {
    google: "3aO7Z39e_8aJ5G5-ahLLZ19x1d0jYU4iVHpMllkdn1Q",
    ...(BING_VERIFICATION
      ? { other: { "msvalidate.01": BING_VERIFICATION } }
      : {}),
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: "https://tixrepo.com",
    siteName: SITE_NAME,
    locale: "ja_JP",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff6b9d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* No web font: the Noto Sans JP stylesheet blocked the first paint and pulled ~120 font files, each
            re-laying out the page. The system Japanese font is used instead (see --font-sans in globals.css). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSiteStructuredData()) }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <VerificationNotice />
        <div className="min-h-screen">
          {children}
          <Footer />
        </div>
        {GA_ID && (
          <Suspense fallback={null}>
            <AnalyticsNavigationTracker />
          </Suspense>
        )}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="beforeInteractive">
              {gaBootstrapScript(GA_ID)}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
