import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { createPageMetadata } from "@/lib/seo";
import { siteConfig } from "@/data/site";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy Policy",
  description:
    "How The Curtain Guy handles estimate requests, account information, uploaded files, and customer communication.",
  path: "/privacy",
});

const sections = [
  {
    title: "What we collect",
    body: "When you submit an estimate request or create an account, The Curtain Guy may collect details such as your name, email, phone number, event details, venue details, notes, and uploaded files (for example floor plans or venue photos).",
  },
  {
    title: "How we use information",
    body: "We use this information to review requests, prepare rental estimates, communicate with you about your event, and manage customer accounts. We do not sell your personal information.",
  },
  {
    title: "Uploaded files",
    body: "Files submitted with estimate requests are stored privately and used to plan and quote your event draping needs. Access is limited to account holders as appropriate and to The Curtain Guy for operational review.",
  },
  {
    title: "Third-party services",
    body: "We may use third-party services to operate the site and communicate with you. These can include Supabase (database, authentication, and private file storage), Resend (transactional email), and Vercel (hosting). Each provider processes data according to their own policies and our configuration.",
  },
  {
    title: "Retention and requests",
    body: "We keep information as needed to manage estimates, accounts, and legitimate business records. You may contact us to request correction or deletion of personal information where applicable.",
  },
  {
    title: "Contact",
    body: `Questions about privacy can be sent to ${siteConfig.email}. This page is a practical summary for customers — not legal advice. The company should review wording before treating it as a formal legal policy if required.`,
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="How The Curtain Guy handles estimate requests, account information, uploaded files, and customer communication."
      />

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.title} className="border-border/40 bg-card/25">
                <CardContent className="p-5 sm:p-6">
                  <h2 className="font-heading text-lg font-medium text-foreground">
                    {section.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ready to plan an event?{" "}
            <Link href="/get-estimate" className="text-primary hover:underline">
              Request an estimate
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
