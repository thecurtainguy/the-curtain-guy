import { writeFileSync } from "node:fs";
import { siteMediaList } from "../src/data/site-media";

function esc(s: string) {
  return s.replace(/'/g, "''");
}

const values = siteMediaList
  .map((s, i) => {
    const caption = s.caption ? `'${esc(s.caption)}'` : "null";
    const notes = s.notes ? `'${esc(s.notes)}'` : "null";
    return `('${esc(s.key)}', '${esc(s.page)}', '${esc(s.section)}', '${esc(s.title)}', '${esc(s.path)}', '${esc(s.alt)}', ${caption}, ${notes}, ${s.sortOrder ?? i}, true)`;
  })
  .join(",\n");

const sql = `insert into public.site_image_slots (key, page, section, title, image_url, alt_text, caption, notes, sort_order, is_active)
values
${values}
on conflict (key) do update set
  page = excluded.page,
  section = excluded.section,
  title = excluded.title,
  image_url = excluded.image_url,
  alt_text = excluded.alt_text,
  caption = excluded.caption,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();
`;

writeFileSync("scripts/seed-site-image-slots.sql", sql);
console.log(`Wrote ${siteMediaList.length} slots`);
