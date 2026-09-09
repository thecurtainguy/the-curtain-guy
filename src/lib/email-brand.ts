import { brandLogo, siteConfig } from "@/data/site";

/** Absolute logo URL for email clients (relative paths do not load). */
export function getEmailLogoAbsoluteUrl(): string {
  let base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    `https://www.${siteConfig.domain}`;
  if (base === `https://${siteConfig.domain}`) {
    base = `https://www.${siteConfig.domain}`;
  }
  return `${base}${brandLogo.src}`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * Logo + brand eyebrow for dark email shells (quotes, jobs).
 * White tile keeps the mark readable on navy/gold cards.
 */
export function emailDarkBrandHeaderHtml(options?: {
  size?: number;
}): string {
  const outer = options?.size ?? 52;
  const inner = Math.max(outer - 8, 28);
  const src = escapeAttr(getEmailLogoAbsoluteUrl());
  const alt = escapeAttr(brandLogo.alt);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 14px;">
  <tr>
    <td style="vertical-align:middle;padding:0 12px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff;border-radius:12px;">
        <tr>
          <td style="padding:4px;line-height:0;font-size:0;">
            <img src="${src}" width="${inner}" height="${inner}" alt="${alt}" style="display:block;width:${inner}px;height:${inner}px;border:0;border-radius:8px;" />
          </td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:middle;">
      <p style="margin:0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af37;font-family:Georgia,'Times New Roman',serif;">${escapeAttr(siteConfig.name)}</p>
    </td>
  </tr>
</table>`;
}

/**
 * Logo row for navy banner headers on light estimate/contact emails.
 */
export function emailBannerBrandHeaderHtml(options?: {
  size?: number;
}): string {
  const outer = options?.size ?? 44;
  const inner = Math.max(outer - 8, 24);
  const src = escapeAttr(getEmailLogoAbsoluteUrl());
  const alt = escapeAttr(brandLogo.alt);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 12px;">
  <tr>
    <td style="vertical-align:middle;padding:0 10px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#ffffff;border-radius:10px;">
        <tr>
          <td style="padding:4px;line-height:0;font-size:0;">
            <img src="${src}" width="${inner}" height="${inner}" alt="${alt}" style="display:block;width:${inner}px;height:${inner}px;border:0;border-radius:6px;" />
          </td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:middle;">
      <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#d4af37;font-family:Georgia,'Times New Roman',serif;">${escapeAttr(siteConfig.name)}</p>
    </td>
  </tr>
</table>`;
}
