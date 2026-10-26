import type { CustomerLanguage } from "@/data/customer-language";
import type { CustomerRow } from "@/data/customers";
import type { BusinessSettings } from "@/data/invoices";
import { getLocalizedDocumentText } from "@/lib/document-texts";
import { getSiteUrl } from "@/lib/env";
import { invoiceEmailFrom, invoiceReplyTo } from "@/lib/invoice-email";
import {
  bodyTextToEmailHtml,
  brandQuoteEmailShell,
  escapeEmailHtml,
} from "@/lib/quote-email-compose";
import { sendResendEmail } from "@/lib/resend";

const INVITE_COPY = {
  en: {
    subject: (business: string) => `Your ${business} client portal`,
    headline: "Your client portal is ready",
    greeting: (name: string) => `Hi ${name},`,
    newAccount:
      "We've set up a private client portal for you. Create your account with this email address to see your quotes, booked events, invoices and payment details in one place.",
    existingAccount:
      "Your client portal is ready. Sign in with this email address to see your quotes, booked events, invoices and payment details in one place.",
    createButton: "Create my account",
    signInButton: "Sign in",
    perks: ["Approve quotes online", "Event details and schedule", "Invoices and payment options"],
    emailNote: (email: string) => `Use ${email} so we can connect your bookings automatically.`,
  },
  fr: {
    subject: (business: string) => `Votre portail client ${business}`,
    headline: "Votre portail client est prêt",
    greeting: (name: string) => `Bonjour ${name},`,
    newAccount:
      "Nous avons préparé un portail client privé pour vous. Créez votre compte avec cette adresse courriel pour consulter vos soumissions, événements réservés, factures et modes de paiement au même endroit.",
    existingAccount:
      "Votre portail client est prêt. Connectez-vous avec cette adresse courriel pour consulter vos soumissions, événements réservés, factures et modes de paiement au même endroit.",
    createButton: "Créer mon compte",
    signInButton: "Me connecter",
    perks: ["Approuvez vos soumissions en ligne", "Détails et horaire de l'événement", "Factures et modes de paiement"],
    emailNote: (email: string) => `Utilisez ${email} pour que vos réservations soient reliées automatiquement.`,
  },
} as const;

export function portalInviteUrl(
  customer: Pick<CustomerRow, "primary_email" | "preferred_language" | "user_id">
): string {
  const site = getSiteUrl().replace(/\/$/, "");
  const prefix = customer.preferred_language === "fr" ? "/fr" : "";
  const page = customer.user_id ? "login" : "signup";
  return `${site}${prefix}/account/${page}?email=${encodeURIComponent(customer.primary_email)}`;
}

export async function buildPortalInviteEmail(input: {
  customer: CustomerRow;
  settings: BusinessSettings;
  language?: CustomerLanguage;
}): Promise<{ subject: string; text: string; html: string; url: string; from: string; replyTo: string }> {
  const language = input.language ?? input.customer.preferred_language;
  const t = INVITE_COPY[language];
  const url = portalInviteUrl({ ...input.customer, preferred_language: language });
  const hasAccount = Boolean(input.customer.user_id);
  const name = input.customer.display_name.split(/\s+/)[0] || input.customer.display_name;
  const intro = hasAccount ? t.existingAccount : t.newAccount;
  const button = hasAccount ? t.signInButton : t.createButton;
  const footer = await getLocalizedDocumentText("quote.email_footer", language);

  const text = [
    t.greeting(name),
    "",
    intro,
    "",
    ...t.perks.map((perk) => `• ${perk}`),
    "",
    t.emailNote(input.customer.primary_email),
    "",
    url,
  ].join("\n");

  const html = brandQuoteEmailShell(
    t.headline,
    `
    ${bodyTextToEmailHtml(`${t.greeting(name)}\n\n${intro}`)}
    <div style="margin:0 0 18px;padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(212,175,55,0.2);">
      ${t.perks
        .map(
          (perk) =>
            `<p style="margin:0 0 6px;font-size:14px;color:#f8f5ec;"><span style="color:#d4af37;">✓</span>&nbsp; ${escapeEmailHtml(perk)}</p>`
        )
        .join("")}
    </div>
    <p style="margin:0 0 8px;">
      <a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#d4af37;color:#111827;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">
        ${escapeEmailHtml(button)}
      </a>
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#8b909a;">${escapeEmailHtml(t.emailNote(input.customer.primary_email))}</p>
  `,
    footer,
    language
  );

  return {
    subject: t.subject(input.settings.trade_name),
    text,
    html,
    url,
    from: invoiceEmailFrom(),
    replyTo: invoiceReplyTo(input.settings),
  };
}

export async function sendPortalInviteEmail(input: {
  apiKey: string;
  customer: CustomerRow;
  settings: BusinessSettings;
  cc?: string[];
}): Promise<{ url: string }> {
  const email = await buildPortalInviteEmail({ customer: input.customer, settings: input.settings });
  await sendResendEmail({
    apiKey: input.apiKey,
    from: email.from,
    to: [input.customer.primary_email],
    cc: input.cc?.filter(Boolean),
    replyTo: email.replyTo,
    subject: email.subject,
    text: email.text,
    html: email.html,
    logLabel: "portal-invite",
  });
  return { url: email.url };
}
