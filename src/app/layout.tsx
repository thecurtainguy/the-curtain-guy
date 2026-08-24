import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { SiteShell } from "@/components/layout/site-shell";
import { siteConfig } from "@/data/site";
import { organizationJsonLd } from "@/lib/seo";

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

export const metadata: Metadata = {
  title: {
    default:
      "Luxury Event Drape Rentals Montreal | The Curtain Guy",
    template: "%s | The Curtain Guy",
  },
  description: siteConfig.description,
  metadataBase: new URL(`https://${siteConfig.domain}`),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Luxury Event Drape Rentals Montreal | The Curtain Guy",
    description: siteConfig.description,
    url: `https://${siteConfig.domain}`,
    siteName: siteConfig.name,
    locale: "en_CA",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "dark h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        inter.variable,
        playfair.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
