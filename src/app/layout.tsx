import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteShell } from "@/components/layout/site-shell";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { UnsavedChangesProvider } from "@/components/providers/unsaved-changes-provider";
import { siteConfig } from "@/data/site";
import { organizationJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl().replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default:
      "Luxury Event Drape Rentals Montreal | The Curtain Guy",
    template: "%s | The Curtain Guy",
  },
  description: siteConfig.description,
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Luxury Event Drape Rentals Montreal | The Curtain Guy",
    description: siteConfig.description,
    url: siteUrl,
    siteName: siteConfig.name,
    locale: "en_CA",
    type: "website",
    images: [
      {
        url: "/images/brand/logo-full.png",
        width: 1024,
        height: 1024,
        alt: "The Curtain Guy logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Luxury Event Drape Rentals Montreal | The Curtain Guy",
    description: siteConfig.description,
    images: ["/images/brand/logo-full.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        playfair.variable,
        "font-sans"
      )}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("tcg-theme");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <ThemeProvider>
          <UnsavedChangesProvider>
            <SiteShell>{children}</SiteShell>
          </UnsavedChangesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
