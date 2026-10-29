/** `?via=email|pdf` tells which link brought the visitor; untagged visits count as direct. */
export const LINK_CHANNEL_PARAM = "via";

export type TaggedLinkChannel = "email" | "pdf";

export function withLinkChannel(url: string, channel: TaggedLinkChannel): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(LINK_CHANNEL_PARAM, channel);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function linkChannelFrom(
  value: string | string[] | undefined | null
): TaggedLinkChannel | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "email" || raw === "pdf" ? raw : null;
}
