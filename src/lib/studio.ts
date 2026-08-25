import "server-only";

import type { User } from "@supabase/supabase-js";
import {
  STUDIO_MAX_PAYLOAD_BYTES,
  STUDIO_STATUSES,
  STUDIO_TITLE_MAX_LENGTH,
  validateStudioDesign,
  type StudioDesignRow,
  type StudioDesignStatus,
} from "@/data/studio";
import type { EventJobRow } from "@/data/jobs";
import type { QuoteRow } from "@/data/quotes";
import type { UserRole } from "@/lib/auth";
import {
  customerCanAccessEstimate,
  type EstimateRequestRow,
} from "@/lib/estimate-access";
import { customerCanAccessJob } from "@/lib/jobs";
import { customerCanAccessQuote } from "@/lib/quotes";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const STUDIO_REQUEST_MAX_BYTES = 320 * 1024;

export type StudioActor = {
  userId: string;
  role: UserRole;
  user?: User;
};

export type StudioErrorCode =
  | "validation"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "database";

export type StudioFailure = {
  ok: false;
  code: StudioErrorCode;
  message: string;
};

export type StudioResult<T extends object> =
  | ({ ok: true } & T)
  | StudioFailure;

export type StudioListFilters = {
  status?: StudioDesignStatus | null;
  search?: string;
  limit?: number;
  estimateRequestId?: string;
  quoteId?: string;
  jobId?: string;
};

type StudioLinkInput = {
  estimateRequestId?: string | null;
  quoteId?: string | null;
  jobId?: string | null;
  opportunityRef?: string | null;
};

type ResolvedStudioLinks = {
  estimate_request_id: string | null;
  quote_id: string | null;
  job_id: string | null;
  opportunity_ref: string | null;
  derivedOwnerUserId: string;
};

type EstimateLinkRow = Pick<
  EstimateRequestRow,
  | "id"
  | "user_id"
  | "customer_name"
  | "customer_email"
  | "venue_name"
  | "opportunity_ref"
>;

type QuoteLinkRow = Pick<
  QuoteRow,
  | "id"
  | "estimate_request_id"
  | "opportunity_ref"
  | "customer_name"
  | "customer_email"
  | "venue_name"
>;

type JobLinkRow = Pick<
  EventJobRow,
  | "id"
  | "estimate_request_id"
  | "quote_id"
  | "opportunity_ref"
  | "customer_user_id"
  | "customer_name"
  | "customer_email"
  | "venue_name"
>;

type ParsedBody =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; status: 400 | 413; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(code: StudioErrorCode, message: string): StudioFailure {
  return { ok: false, code, message };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateActor(
  actor: StudioActor,
  requiredRole?: UserRole
): StudioFailure | null {
  if (
    !isUuid(actor.userId) ||
    (actor.role !== "owner" && actor.role !== "customer") ||
    (requiredRole && actor.role !== requiredRole) ||
    (actor.user && actor.user.id !== actor.userId) ||
    (actor.role === "customer" && !actor.user)
  ) {
    return failure("forbidden", "You do not have access to Studio designs.");
  }
  return null;
}

function validateDesignId(id: string): StudioFailure | null {
  return isUuid(id)
    ? null
    : failure("validation", "A valid Studio design ID is required.");
}

function parseLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(200, Math.max(1, Math.trunc(value as number)));
}

function validateFilters(filters: StudioListFilters): StudioFailure | null {
  if (
    filters.status &&
    !STUDIO_STATUSES.includes(filters.status as StudioDesignStatus)
  ) {
    return failure("validation", "Choose a valid Studio design status.");
  }
  if (
    filters.search !== undefined &&
    (typeof filters.search !== "string" || filters.search.length > 200)
  ) {
    return failure("validation", "Search must be under 200 characters.");
  }
  if (
    filters.limit !== undefined &&
    (!Number.isFinite(filters.limit) || filters.limit < 1)
  ) {
    return failure("validation", "Limit must be a positive number.");
  }
  for (const [label, value] of [
    ["estimateRequestId", filters.estimateRequestId],
    ["quoteId", filters.quoteId],
    ["jobId", filters.jobId],
  ] as const) {
    if (value !== undefined && !isUuid(value)) {
      return failure("validation", `${label} must be a valid UUID.`);
    }
  }
  return null;
}

function validateTitle(value: unknown): string | StudioFailure {
  if (typeof value !== "string") {
    return failure("validation", "A Studio design title is required.");
  }
  const title = value.trim();
  if (!title || title.length > STUDIO_TITLE_MAX_LENGTH) {
    return failure(
      "validation",
      `Title must be between 1 and ${STUDIO_TITLE_MAX_LENGTH} characters.`
    );
  }
  return title;
}

function validateEditableStatus(
  value: unknown,
  defaultStatus?: StudioDesignStatus
): StudioDesignStatus | StudioFailure {
  if (value === undefined && defaultStatus) return defaultStatus;
  if (
    typeof value !== "string" ||
    !STUDIO_STATUSES.includes(value as StudioDesignStatus)
  ) {
    return failure("validation", "Choose a valid Studio design status.");
  }
  if (value === "archived") {
    return failure(
      "validation",
      "Use the archive action to archive a Studio design."
    );
  }
  return value as StudioDesignStatus;
}

function readUuidLink(
  body: Record<string, unknown>,
  field: "estimate_request_id" | "quote_id" | "job_id"
): string | null | undefined | StudioFailure {
  if (!(field in body)) return undefined;
  const value = body[field];
  if (value === null) return null;
  if (!isUuid(value)) {
    return failure("validation", `${field} must be a valid UUID or null.`);
  }
  return value;
}

function readOpportunityRef(
  body: Record<string, unknown>
): string | null | undefined | StudioFailure {
  if (!("opportunity_ref" in body)) return undefined;
  const value = body.opportunity_ref;
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > 100
  ) {
    return failure(
      "validation",
      "opportunity_ref must be a nonblank string under 100 characters or null."
    );
  }
  return value.trim();
}

function readLinkInput(
  body: Record<string, unknown>
): StudioResult<{ links: StudioLinkInput }> {
  const estimateRequestId = readUuidLink(body, "estimate_request_id");
  if (isFailure(estimateRequestId)) return estimateRequestId;
  const quoteId = readUuidLink(body, "quote_id");
  if (isFailure(quoteId)) return quoteId;
  const jobId = readUuidLink(body, "job_id");
  if (isFailure(jobId)) return jobId;
  const opportunityRef = readOpportunityRef(body);
  if (isFailure(opportunityRef)) return opportunityRef;

  return {
    ok: true,
    links: { estimateRequestId, quoteId, jobId, opportunityRef },
  };
}

function isFailure(value: unknown): value is StudioFailure {
  return (
    isRecord(value) &&
    value.ok === false &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

async function loadEstimate(
  id: string
): Promise<StudioResult<{ estimate: EstimateLinkRow }>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("estimate_requests")
    .select(
      "id, user_id, customer_name, customer_email, venue_name, opportunity_ref"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[studio] Failed to load linked estimate:", error.message);
    return failure("database", "Could not verify the linked estimate.");
  }
  if (!data) return failure("not_found", "Linked estimate not found.");
  return { ok: true, estimate: data as EstimateLinkRow };
}

async function loadQuote(
  id: string
): Promise<StudioResult<{ quote: QuoteLinkRow }>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("quotes")
    .select(
      "id, estimate_request_id, opportunity_ref, customer_name, customer_email, venue_name"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[studio] Failed to load linked quote:", error.message);
    return failure("database", "Could not verify the linked quote.");
  }
  if (!data) return failure("not_found", "Linked quote not found.");
  return { ok: true, quote: data as QuoteLinkRow };
}

async function loadJob(
  id: string
): Promise<StudioResult<{ job: JobLinkRow }>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("event_jobs")
    .select(
      "id, estimate_request_id, quote_id, opportunity_ref, customer_user_id, customer_name, customer_email, venue_name"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[studio] Failed to load linked job:", error.message);
    return failure("database", "Could not verify the linked event.");
  }
  if (!data) return failure("not_found", "Linked event not found.");
  return { ok: true, job: data as JobLinkRow };
}

async function findCustomerAccountId(
  emails: Array<string | null | undefined>
): Promise<StudioResult<{ userId: string | null }>> {
  const candidateEmails = [
    ...new Set(
      emails
        .map((value) => value?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value))
    ),
  ];
  if (candidateEmails.length === 0) return { ok: true, userId: null };

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, email")
    .eq("role", "customer")
    .eq("is_active", true)
    .in("email", candidateEmails);

  if (error) {
    console.error(
      "[studio] Failed to resolve linked customer account:",
      error.message
    );
    return failure("database", "Could not verify the linked customer.");
  }
  const profiles = (data ?? []).filter(
    (profile) =>
      typeof profile.id === "string" &&
      typeof profile.email === "string" &&
      candidateEmails.includes(profile.email.trim().toLowerCase())
  );
  for (const email of candidateEmails) {
    const matches = profiles.filter(
      (profile) => profile.email.trim().toLowerCase() === email
    );
    if (matches.length > 1) {
      return failure(
        "conflict",
        "More than one customer account matches the linked event email."
      );
    }
    if (matches.length === 1) {
      return { ok: true, userId: String(matches[0].id) };
    }
  }
  return { ok: true, userId: null };
}

async function resolveStudioLinks(
  actor: StudioActor,
  input: StudioLinkInput
): Promise<StudioResult<{ links: ResolvedStudioLinks }>> {
  let estimateId = input.estimateRequestId ?? null;
  let quoteId = input.quoteId ?? null;
  const jobId = input.jobId ?? null;
  let estimate: EstimateLinkRow | null = null;
  let quote: QuoteLinkRow | null = null;
  let job: JobLinkRow | null = null;

  if (!estimateId && !quoteId && !jobId) {
    if (input.opportunityRef) {
      return failure(
        "conflict",
        "An opportunity reference must come from a linked estimate, quote, or event."
      );
    }
    return {
      ok: true,
      links: {
        estimate_request_id: null,
        quote_id: null,
        job_id: null,
        opportunity_ref: null,
        derivedOwnerUserId: actor.userId,
      },
    };
  }

  if (jobId) {
    const jobResult = await loadJob(jobId);
    if (!jobResult.ok) return jobResult;
    job = jobResult.job;

    if (input.quoteId && input.quoteId !== job.quote_id) {
      return failure(
        "conflict",
        "The selected quote does not belong to the linked event."
      );
    }
    if (
      input.estimateRequestId &&
      input.estimateRequestId !== job.estimate_request_id
    ) {
      return failure(
        "conflict",
        "The selected estimate does not belong to the linked event."
      );
    }
    quoteId = job.quote_id ?? quoteId;
    estimateId = job.estimate_request_id ?? estimateId;
  }

  if (quoteId) {
    const quoteResult = await loadQuote(quoteId);
    if (!quoteResult.ok) return quoteResult;
    quote = quoteResult.quote;

    if (
      estimateId &&
      quote.estimate_request_id &&
      estimateId !== quote.estimate_request_id
    ) {
      return failure(
        "conflict",
        "The selected estimate does not belong to the linked quote."
      );
    }
    estimateId = quote.estimate_request_id ?? estimateId;
  }

  if (estimateId) {
    const estimateResult = await loadEstimate(estimateId);
    if (!estimateResult.ok) return estimateResult;
    estimate = estimateResult.estimate;
  }

  const opportunityRefs = [
    job?.opportunity_ref,
    quote?.opportunity_ref,
    estimate?.opportunity_ref,
  ].filter((value): value is string => Boolean(value));
  const distinctRefs = new Set(opportunityRefs);
  if (distinctRefs.size > 1) {
    return failure(
      "conflict",
      "The linked records do not share the same opportunity reference."
    );
  }
  const opportunityRef = opportunityRefs[0] ?? null;
  if (
    input.opportunityRef &&
    (!opportunityRef || input.opportunityRef !== opportunityRef)
  ) {
    return failure(
      "conflict",
      "The opportunity reference does not match the linked record."
    );
  }

  if (actor.role === "customer") {
    const user = actor.user;
    if (!user) {
      return failure("forbidden", "Customer access could not be verified.");
    }
    if (estimate && !customerCanAccessEstimate(estimate, user)) {
      return failure(
        "forbidden",
        "You do not have access to the linked estimate."
      );
    }
    if (quote && !customerCanAccessQuote(quote, user, estimate)) {
      return failure(
        "forbidden",
        "You do not have access to the linked quote."
      );
    }
    if (job && !customerCanAccessJob(job, user, estimate)) {
      return failure(
        "forbidden",
        "You do not have access to the linked event."
      );
    }
  }

  let derivedOwnerUserId = actor.userId;
  if (actor.role === "owner") {
    const directCustomerId = job?.customer_user_id ?? estimate?.user_id ?? null;
    if (directCustomerId) {
      derivedOwnerUserId = directCustomerId;
    } else {
      const accountResult = await findCustomerAccountId([
        job?.customer_email,
        quote?.customer_email,
        estimate?.customer_email,
      ]);
      if (!accountResult.ok) return accountResult;
      derivedOwnerUserId = accountResult.userId ?? actor.userId;
    }
  }

  return {
    ok: true,
    links: {
      estimate_request_id: estimate?.id ?? null,
      quote_id: quote?.id ?? null,
      job_id: job?.id ?? null,
      opportunity_ref: opportunityRef,
      derivedOwnerUserId,
    },
  };
}

async function loadStudioDesign(
  id: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("studio_designs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[studio] Failed to load design:", error.message);
    return failure("database", "Could not load the Studio design.");
  }
  if (!data) return failure("not_found", "Studio design not found.");
  return { ok: true, design: data as StudioDesignRow };
}

function enforceDesignAccess(
  actor: StudioActor,
  design: StudioDesignRow
): StudioFailure | null {
  if (actor.role === "owner") return null;
  return design.owner_user_id === actor.userId
    ? null
    : failure("forbidden", "You do not have access to this Studio design.");
}

function chunkIds(ids: string[], size = 100): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

async function searchAdminDesigns(
  rows: StudioDesignRow[],
  search: string
): Promise<StudioResult<{ designs: StudioDesignRow[] }>> {
  const needle = search.trim().toLowerCase();
  if (!needle) return { ok: true, designs: rows };

  const admin = createAdminSupabaseClient();
  const estimateIds = [
    ...new Set(
      rows
        .map((row) => row.estimate_request_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const quoteIds = [
    ...new Set(
      rows
        .map((row) => row.quote_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const jobIds = [
    ...new Set(
      rows
        .map((row) => row.job_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const [estimateResults, quoteResults, jobResults] = await Promise.all([
    Promise.all(
      chunkIds(estimateIds).map((ids) =>
        admin
          .from("estimate_requests")
          .select("id, customer_name, customer_email, venue_name")
          .in("id", ids)
      )
    ),
    Promise.all(
      chunkIds(quoteIds).map((ids) =>
        admin
          .from("quotes")
          .select("id, customer_name, customer_email, venue_name")
          .in("id", ids)
      )
    ),
    Promise.all(
      chunkIds(jobIds).map((ids) =>
        admin
          .from("event_jobs")
          .select("id, customer_name, customer_email, venue_name, event_name")
          .in("id", ids)
      )
    ),
  ]);

  for (const result of [
    ...estimateResults,
    ...quoteResults,
    ...jobResults,
  ]) {
    if (result.error) {
      console.error(
        "[studio] Failed to load linked search context:",
        result.error.message
      );
      return failure(
        "database",
        "Could not search linked Studio design context."
      );
    }
  }

  const estimateData = estimateResults.flatMap((result) => result.data ?? []);
  const quoteData = quoteResults.flatMap((result) => result.data ?? []);
  const jobData = jobResults.flatMap((result) => result.data ?? []);
  const contextByKey = new Map<string, string>();
  for (const [prefix, data] of [
    ["estimate", estimateData],
    ["quote", quoteData],
    ["job", jobData],
  ] as const) {
    for (const record of data ?? []) {
      contextByKey.set(
        `${prefix}:${String(record.id)}`,
        Object.values(record)
          .filter((value): value is string => typeof value === "string")
          .join(" ")
          .toLowerCase()
      );
    }
  }

  return {
    ok: true,
    designs: rows.filter((row) => {
      const context = [
        row.title,
        row.opportunity_ref,
        row.estimate_request_id
          ? contextByKey.get(`estimate:${row.estimate_request_id}`)
          : null,
        row.quote_id ? contextByKey.get(`quote:${row.quote_id}`) : null,
        row.job_id ? contextByKey.get(`job:${row.job_id}`) : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase();
      return context.includes(needle);
    }),
  };
}

export async function parseStudioRequestBody(
  request: Request
): Promise<ParsedBody> {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > STUDIO_REQUEST_MAX_BYTES
  ) {
    return {
      ok: false,
      status: 413,
      message: "The Studio save request is too large.",
    };
  }

  let text = "";
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let bytesRead = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesRead += value.byteLength;
          if (bytesRead > STUDIO_REQUEST_MAX_BYTES) {
            await reader.cancel();
            return {
              ok: false,
              status: 413,
              message: "The Studio save request is too large.",
            };
          }
          text += decoder.decode(value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    }
  } catch {
    return { ok: false, status: 400, message: "Could not read request body." };
  }

  try {
    const body = JSON.parse(text) as unknown;
    if (!isRecord(body)) {
      return {
        ok: false,
        status: 400,
        message: "Request body must be a JSON object.",
      };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, message: "Invalid JSON body." };
  }
}

export function studioErrorHttpStatus(
  code: StudioErrorCode
): 400 | 403 | 404 | 409 | 500 {
  if (code === "forbidden") return 403;
  if (code === "not_found") return 404;
  if (code === "conflict") return 409;
  if (code === "database") return 500;
  return 400;
}

export async function listAdminStudioDesigns(
  actor: StudioActor,
  filters: StudioListFilters = {}
): Promise<StudioResult<{ designs: StudioDesignRow[] }>> {
  const actorError = validateActor(actor, "owner");
  if (actorError) return actorError;
  const filterError = validateFilters(filters);
  if (filterError) return filterError;

  const limit = parseLimit(filters.limit);
  const search = filters.search?.trim() ?? "";
  const admin = createAdminSupabaseClient();
  let rows: StudioDesignRow[] = [];

  if (search) {
    const batchSize = 1000;
    for (let from = 0; ; from += batchSize) {
      let query = admin
        .from("studio_designs")
        .select("*")
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + batchSize - 1);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.estimateRequestId) {
        query = query.eq("estimate_request_id", filters.estimateRequestId);
      }
      if (filters.quoteId) query = query.eq("quote_id", filters.quoteId);
      if (filters.jobId) query = query.eq("job_id", filters.jobId);
      const { data, error } = await query;
      if (error) {
        console.error("[studio] Failed to list admin designs:", error.message);
        return failure("database", "Could not load Studio designs.");
      }
      const batch = (data ?? []) as StudioDesignRow[];
      rows.push(...batch);
      if (batch.length < batchSize) break;
    }
    const searchResult = await searchAdminDesigns(rows, search);
    if (!searchResult.ok) return searchResult;
    return { ok: true, designs: searchResult.designs.slice(0, limit) };
  }

  let query = admin
    .from("studio_designs")
    .select("*")
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.estimateRequestId) {
    query = query.eq("estimate_request_id", filters.estimateRequestId);
  }
  if (filters.quoteId) query = query.eq("quote_id", filters.quoteId);
  if (filters.jobId) query = query.eq("job_id", filters.jobId);
  const { data, error } = await query;
  if (error) {
    console.error("[studio] Failed to list admin designs:", error.message);
    return failure("database", "Could not load Studio designs.");
  }
  rows = (data ?? []) as StudioDesignRow[];
  return { ok: true, designs: rows };
}

export async function getAdminStudioDesign(
  actor: StudioActor,
  id: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const actorError = validateActor(actor, "owner");
  if (actorError) return actorError;
  const idError = validateDesignId(id);
  if (idError) return idError;
  return loadStudioDesign(id);
}

export async function listCustomerStudioDesigns(
  actor: StudioActor,
  filters: StudioListFilters = {}
): Promise<StudioResult<{ designs: StudioDesignRow[] }>> {
  const actorError = validateActor(actor, "customer");
  if (actorError) return actorError;
  const filterError = validateFilters(filters);
  if (filterError) return filterError;

  const limit = parseLimit(filters.limit);
  const search = filters.search?.trim().toLowerCase() ?? "";
  const admin = createAdminSupabaseClient();
  let designs: StudioDesignRow[] = [];

  if (search) {
    const batchSize = 1000;
    for (let from = 0; ; from += batchSize) {
      let query = admin
        .from("studio_designs")
        .select("*")
        .eq("owner_user_id", actor.userId)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + batchSize - 1);
      if (filters.status) query = query.eq("status", filters.status);
      else query = query.neq("status", "archived");
      if (filters.estimateRequestId) {
        query = query.eq("estimate_request_id", filters.estimateRequestId);
      }
      if (filters.quoteId) query = query.eq("quote_id", filters.quoteId);
      if (filters.jobId) query = query.eq("job_id", filters.jobId);
      const { data, error } = await query;
      if (error) {
        console.error("[studio] Failed to list customer designs:", error.message);
        return failure("database", "Could not load Studio designs.");
      }
      const batch = (data ?? []) as StudioDesignRow[];
      designs.push(...batch);
      if (batch.length < batchSize) break;
    }
    designs = designs
      .filter((row) =>
        `${row.title} ${row.opportunity_ref ?? ""}`
          .toLowerCase()
          .includes(search)
      )
      .slice(0, limit);
    return { ok: true, designs };
  }

  let query = admin
    .from("studio_designs")
    .select("*")
    .eq("owner_user_id", actor.userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: true })
    .limit(limit);
  if (filters.status) query = query.eq("status", filters.status);
  else query = query.neq("status", "archived");
  if (filters.estimateRequestId) {
    query = query.eq("estimate_request_id", filters.estimateRequestId);
  }
  if (filters.quoteId) query = query.eq("quote_id", filters.quoteId);
  if (filters.jobId) query = query.eq("job_id", filters.jobId);
  const { data, error } = await query;
  if (error) {
    console.error("[studio] Failed to list customer designs:", error.message);
    return failure("database", "Could not load Studio designs.");
  }
  designs = (data ?? []) as StudioDesignRow[];
  return { ok: true, designs };
}

export async function getCustomerStudioDesign(
  actor: StudioActor,
  id: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const actorError = validateActor(actor, "customer");
  if (actorError) return actorError;
  const idError = validateDesignId(id);
  if (idError) return idError;

  const result = await loadStudioDesign(id);
  if (!result.ok) return result;
  const accessError = enforceDesignAccess(actor, result.design);
  return accessError ?? result;
}

export async function createStudioDesign(
  actor: StudioActor,
  input: unknown
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const actorError = validateActor(actor);
  if (actorError) return actorError;
  if (!isRecord(input)) {
    return failure("validation", "Request body must be a JSON object.");
  }
  if ("owner_user_id" in input || "created_by_user_id" in input) {
    return failure("validation", "Ownership fields are not accepted.");
  }

  const title = validateTitle(input.title);
  if (isFailure(title)) return title;
  const status = validateEditableStatus(input.status, "draft");
  if (isFailure(status)) return status;
  const designValidation = validateStudioDesign(
    input.design_json,
    STUDIO_MAX_PAYLOAD_BYTES
  );
  if (!designValidation.valid) {
    return failure(
      "validation",
      designValidation.errors[0] ?? "The Studio design is invalid."
    );
  }

  const linkInput = readLinkInput(input);
  if (!linkInput.ok) return linkInput;
  const linkResult = await resolveStudioLinks(actor, linkInput.links);
  if (!linkResult.ok) return linkResult;

  const admin = createAdminSupabaseClient();
  const { derivedOwnerUserId, ...links } = linkResult.links;
  const { data, error } = await admin
    .from("studio_designs")
    .insert({
      ...links,
      owner_user_id:
        actor.role === "customer" ? actor.userId : derivedOwnerUserId,
      created_by_user_id: actor.userId,
      title,
      status,
      design_json: designValidation.design,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error(
      "[studio] Failed to create design:",
      error?.message ?? "No row returned"
    );
    return failure("database", "Could not create the Studio design.");
  }
  return { ok: true, design: data as StudioDesignRow };
}

export async function updateStudioDesign(
  actor: StudioActor,
  id: string,
  input: unknown
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const actorError = validateActor(actor);
  if (actorError) return actorError;
  const idError = validateDesignId(id);
  if (idError) return idError;
  if (!isRecord(input)) {
    return failure("validation", "Request body must be a JSON object.");
  }
  if ("owner_user_id" in input || "created_by_user_id" in input) {
    return failure("validation", "Ownership fields are not accepted.");
  }

  const currentResult = await loadStudioDesign(id);
  if (!currentResult.ok) return currentResult;
  const accessError = enforceDesignAccess(actor, currentResult.design);
  if (accessError) return accessError;

  let expectedUpdatedAt: string | null = null;
  if ("expected_updated_at" in input) {
    if (
      typeof input.expected_updated_at !== "string" ||
      !Number.isFinite(Date.parse(input.expected_updated_at))
    ) {
      return failure(
        "validation",
        "A valid expected_updated_at timestamp is required."
      );
    }
    expectedUpdatedAt = input.expected_updated_at;
  } else {
    return failure(
      "validation",
      "Refresh this Studio design before saving changes."
    );
  }
  if (
    expectedUpdatedAt &&
    expectedUpdatedAt !== currentResult.design.updated_at
  ) {
    return failure(
      "conflict",
      "This design changed in another session. Refresh before saving."
    );
  }

  const updates: Record<string, unknown> = {};
  if ("title" in input) {
    const title = validateTitle(input.title);
    if (isFailure(title)) return title;
    updates.title = title;
  }
  if ("status" in input) {
    const status = validateEditableStatus(input.status);
    if (isFailure(status)) return status;
    updates.status = status;
  }
  if ("design_json" in input) {
    const validation = validateStudioDesign(
      input.design_json,
      STUDIO_MAX_PAYLOAD_BYTES
    );
    if (!validation.valid) {
      return failure(
        "validation",
        validation.errors[0] ?? "The Studio design is invalid."
      );
    }
    updates.design_json = validation.design;
  }

  const linkFields = [
    "estimate_request_id",
    "quote_id",
    "job_id",
    "opportunity_ref",
  ] as const;
  const linksTouched = linkFields.some((field) => field in input);
  if (linksTouched) {
    const parsedLinks = readLinkInput(input);
    if (!parsedLinks.ok) return parsedLinks;
    const parsed = parsedLinks.links;
    let requestedLinks: StudioLinkInput;

    if (parsed.jobId !== undefined) {
      requestedLinks = {
        jobId: parsed.jobId,
        quoteId: parsed.quoteId,
        estimateRequestId: parsed.estimateRequestId,
        opportunityRef: parsed.opportunityRef,
      };
    } else if (parsed.quoteId !== undefined) {
      requestedLinks = {
        jobId: null,
        quoteId: parsed.quoteId,
        estimateRequestId: parsed.estimateRequestId,
        opportunityRef: parsed.opportunityRef,
      };
    } else if (parsed.estimateRequestId !== undefined) {
      requestedLinks = {
        jobId: null,
        quoteId: null,
        estimateRequestId: parsed.estimateRequestId,
        opportunityRef: parsed.opportunityRef,
      };
    } else {
      requestedLinks = {
        jobId: currentResult.design.job_id,
        quoteId: currentResult.design.quote_id,
        estimateRequestId: currentResult.design.estimate_request_id,
        opportunityRef: parsed.opportunityRef,
      };
    }

    const linkResult = await resolveStudioLinks(actor, requestedLinks);
    if (!linkResult.ok) return linkResult;
    updates.estimate_request_id = linkResult.links.estimate_request_id;
    updates.quote_id = linkResult.links.quote_id;
    updates.job_id = linkResult.links.job_id;
    updates.opportunity_ref = linkResult.links.opportunity_ref;
    if (
      actor.role === "owner" &&
      (linkResult.links.estimate_request_id ||
        linkResult.links.quote_id ||
        linkResult.links.job_id)
    ) {
      // Relinking across customers must move ownership with the trusted
      // server-side relationship to prevent the prior customer retaining access.
      updates.owner_user_id = linkResult.links.derivedOwnerUserId;
    }
  }

  if (Object.keys(updates).length === 0) {
    return failure("validation", "No supported Studio updates were provided.");
  }

  const admin = createAdminSupabaseClient();
  let query = admin
    .from("studio_designs")
    .update(updates)
    .eq("id", id)
    .eq("updated_at", currentResult.design.updated_at);
  if (actor.role === "customer") {
    query = query.eq("owner_user_id", actor.userId);
  }
  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("[studio] Failed to update design:", error.message);
    return failure("database", "Could not update the Studio design.");
  }
  if (!data) {
    return failure(
      "conflict",
      "This design changed in another session. Refresh before saving."
    );
  }
  return { ok: true, design: data as StudioDesignRow };
}

export async function archiveStudioDesign(
  actor: StudioActor,
  id: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const actorError = validateActor(actor);
  if (actorError) return actorError;
  const idError = validateDesignId(id);
  if (idError) return idError;

  const currentResult = await loadStudioDesign(id);
  if (!currentResult.ok) return currentResult;
  const accessError = enforceDesignAccess(actor, currentResult.design);
  if (accessError) return accessError;

  const admin = createAdminSupabaseClient();
  let query = admin
    .from("studio_designs")
    .update({ status: "archived" satisfies StudioDesignStatus })
    .eq("id", id)
    .eq("updated_at", currentResult.design.updated_at);
  if (actor.role === "customer") {
    query = query.eq("owner_user_id", actor.userId);
  }
  const { data, error } = await query.select("*").maybeSingle();

  if (error) {
    console.error("[studio] Failed to archive design:", error.message);
    return failure("database", "Could not archive the Studio design.");
  }
  if (!data) {
    return failure(
      "conflict",
      "This design changed in another session. Refresh before archiving."
    );
  }
  return { ok: true, design: data as StudioDesignRow };
}

export async function linkStudioDesignToEstimate(
  actor: StudioActor,
  designId: string,
  estimateRequestId: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const current = await loadStudioDesign(designId);
  if (!current.ok) return current;
  return updateStudioDesign(actor, designId, {
    estimate_request_id: estimateRequestId,
    expected_updated_at: current.design.updated_at,
  });
}

export async function linkStudioDesignToQuote(
  actor: StudioActor,
  designId: string,
  quoteId: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const current = await loadStudioDesign(designId);
  if (!current.ok) return current;
  return updateStudioDesign(actor, designId, {
    quote_id: quoteId,
    expected_updated_at: current.design.updated_at,
  });
}

export async function linkStudioDesignToJob(
  actor: StudioActor,
  designId: string,
  jobId: string
): Promise<StudioResult<{ design: StudioDesignRow }>> {
  const current = await loadStudioDesign(designId);
  if (!current.ok) return current;
  return updateStudioDesign(actor, designId, {
    job_id: jobId,
    expected_updated_at: current.design.updated_at,
  });
}
