import { promises as dns } from "node:dns";

/** Throwaway inbox services — leads from these can never be followed up. */
const DISPOSABLE_DOMAINS = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "burnermail.io",
  "discard.email",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "grr.la",
  "inboxkitten.com",
  "mail.tm",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailinator.net",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempmail.com",
  "tempmail.dev",
  "tempmail.net",
  "tempmail.plus",
  "tempmailo.com",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "trashmail.de",
  "trashmail.net",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "1secmail.com",
  "1secmail.net",
  "1secmail.org",
]);

/** Misspellings of major providers; several are registered by typo-squatters, so DNS alone passes them. */
const TYPO_DOMAINS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.cm": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotamil.com": "hotmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
  "icoud.com": "icloud.com",
  "videotrom.ca": "videotron.ca",
  "vidéotron.ca": "videotron.ca",
};

const LOOKUP_TIMEOUT_MS = 3_000;

export type EmailDeliverability =
  | { ok: true }
  | { ok: false; reason: "disposable" | "typo" | "no_mail_server"; message: string };

function withTimeout<T>(promise: Promise<T>): Promise<T | "timeout"> {
  return Promise.race([
    promise,
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), LOOKUP_TIMEOUT_MS)),
  ]);
}

/** True when DNS positively says the domain does not exist or has no records. */
async function hasNoRecords(lookup: Promise<unknown[]>): Promise<boolean | null> {
  try {
    const result = await withTimeout(lookup);
    if (result === "timeout") return null;
    return result.length === 0;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "NXDOMAIN") return true;
    return null;
  }
}

/**
 * Rejects throwaway inboxes and domains that cannot receive mail (typos such as
 * gmail.con). DNS errors other than "no such domain" let the address through.
 */
export async function checkEmailDeliverability(
  email: string,
  language: "en" | "fr" = "en"
): Promise<EmailDeliverability> {
  const domain = email.trim().toLowerCase().split("@")[1]?.replace(/\.$/, "") ?? "";
  if (!domain) return { ok: true };

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      reason: "disposable",
      message:
        language === "fr"
          ? "Veuillez utiliser une adresse courriel permanente — les boîtes temporaires ne peuvent pas recevoir notre réponse."
          : "Please use a permanent email address — temporary inboxes can’t receive our reply.",
    };
  }

  const suggestion = TYPO_DOMAINS[domain];
  if (suggestion) {
    return {
      ok: false,
      reason: "typo",
      message:
        language === "fr"
          ? `Vouliez-vous dire @${suggestion}? Vérifiez votre adresse courriel.`
          : `Did you mean @${suggestion}? Please check your email address.`,
    };
  }

  const noMx = await hasNoRecords(dns.resolveMx(domain));
  if (noMx !== true) return { ok: true };
  // No MX: mail falls back to the domain's own address records.
  const [noA, noAaaa] = await Promise.all([
    hasNoRecords(dns.resolve4(domain)),
    hasNoRecords(dns.resolve6(domain)),
  ]);
  if (noA === true && noAaaa === true) {
    return {
      ok: false,
      reason: "no_mail_server",
      message:
        language === "fr"
          ? `« ${domain} » ne peut pas recevoir de courriels — vérifiez l’adresse.`
          : `“${domain}” can’t receive email — please check the address for typos.`,
    };
  }
  return { ok: true };
}
