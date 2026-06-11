import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Profile ----------
export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

const ProfileUpdate = z.object({
  full_name: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  github_url: z.string().nullable().optional(),
  portfolio_url: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
  certifications: z.array(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  resume_url: z.string().nullable().optional(),
  resume_parsed: z.boolean().optional(),
});

function calcCompleteness(p: Record<string, unknown>): number {
  const fields = ["full_name", "headline", "location", "phone", "summary", "linkedin_url"];
  let score = 0;
  for (const f of fields) if (p[f]) score += 10;
  if (Array.isArray(p.skills) && (p.skills as unknown[]).length > 0) score += 15;
  if (Array.isArray(p.experience) && (p.experience as unknown[]).length > 0) score += 15;
  if (Array.isArray(p.education) && (p.education as unknown[]).length > 0) score += 10;
  return Math.min(100, score);
}

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ProfileUpdate.parse(d))
  .handler(async ({ data, context }) => {
    const completeness = calcCompleteness(data as Record<string, unknown>);
    const { error } = await context.supabase
      .from("profiles")
      .update({ ...data, completeness })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, completeness };
  });

// ---------- Parse resume with AI ----------
export const parseResumeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ text: z.string().min(20).max(50000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("./ai-gateway.server");
    const parsed = await aiJson<{
      full_name?: string;
      headline?: string;
      location?: string;
      phone?: string;
      linkedin_url?: string;
      github_url?: string;
      summary?: string;
      skills?: string[];
      experience?: Array<{ title: string; company: string; period?: string; description?: string }>;
      education?: Array<{ degree: string; school: string; period?: string }>;
    }>({
      system:
        'You extract structured profile data from a resume. Return JSON with keys: full_name, headline, location, phone, linkedin_url, github_url, summary (2-3 sentence professional summary), skills (array of strings, max 20), experience (array of {title, company, period, description}), education (array of {degree, school, period}). Use null/empty for unknowns. Be concise.',
      user: data.text,
    });
    // Merge with existing profile
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    const merged = {
      full_name: parsed.full_name || existing?.full_name,
      headline: parsed.headline || existing?.headline,
      location: parsed.location || existing?.location,
      phone: parsed.phone || existing?.phone,
      linkedin_url: parsed.linkedin_url || existing?.linkedin_url,
      github_url: parsed.github_url || existing?.github_url,
      summary: parsed.summary || existing?.summary,
      skills: parsed.skills?.length ? parsed.skills : existing?.skills,
      experience: parsed.experience?.length ? parsed.experience : existing?.experience,
      education: parsed.education?.length ? parsed.education : existing?.education,
      resume_parsed: true,
    };
    const completeness = calcCompleteness(merged as Record<string, unknown>);
    await context.supabase
      .from("profiles")
      .update({ ...merged, completeness })
      .eq("id", context.userId);
    return { parsed, completeness };
  });

// ---------- Jobs ----------
const FiltersSchema = z.object({
  q: z.string().optional(),
  remote: z.boolean().optional(),
  employment_type: z.string().optional(),
  experience_level: z.string().optional(),
  location: z.string().optional(),
  min_salary: z.number().optional(),
});
export type Filters = z.infer<typeof FiltersSchema>;

export const listJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => FiltersSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("jobs")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(100);
    if (data.remote) q = q.eq("remote", true);
    if (data.employment_type) q = q.eq("employment_type", data.employment_type);
    if (data.experience_level) q = q.eq("experience_level", data.experience_level);
    if (data.location) q = q.ilike("location", `%${data.location}%`);
    if (data.min_salary) q = q.gte("salary_max", data.min_salary);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,company.ilike.%${data.q}%,description.ilike.%${data.q}%`);
    const { data: jobs, error } = await q;
    if (error) throw new Error(error.message);
    // Pull user's applications to mark applied state
    const { data: apps } = await context.supabase
      .from("applications")
      .select("job_id,status,ai_score")
      .eq("user_id", context.userId);
    const appsMap = new Map((apps ?? []).map((a) => [a.job_id, a]));
    return (jobs ?? []).map((j) => ({ ...j, application: appsMap.get(j.id) ?? null }));
  });

export const getJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("jobs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !job) throw new Error(error?.message ?? "Job not found");
    const { data: app } = await context.supabase
      .from("applications")
      .select("*")
      .eq("user_id", context.userId)
      .eq("job_id", data.id)
      .maybeSingle();
    return { job, application: app };
  });

// ---------- Applications ----------
export const listApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("applications")
      .select("*, job:jobs(*)")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        status: z.enum([
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "accepted",
  "declined",
  "withdrawn",
]).optional(),
        next_action_at: z.string().nullable().optional(),
        next_action_label: z.string().nullable().optional(),
        interview_at: z.string().nullable().optional(),
assessment_due_at: z.string().nullable().optional(),
offer_expires_at: z.string().nullable().optional(),
joining_date: z.string().nullable().optional(),
interview_link: z.string().nullable().optional(),
interview_type: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch = {
      user_id: context.userId,
      job_id: data.job_id,
      ...(data.status ? { status: data.status } : {}),
      ...(data.status === "applied" ? { applied_at: new Date().toISOString() } : {}),
      ...(data.next_action_at !== undefined ? { next_action_at: data.next_action_at } : {}),
      ...(data.next_action_label !== undefined ? { next_action_label: data.next_action_label } : {}),
      ...(data.interview_at !== undefined ? { interview_at: data.interview_at } : {}),
...(data.assessment_due_at !== undefined ? { assessment_due_at: data.assessment_due_at } : {}),
...(data.offer_expires_at !== undefined ? { offer_expires_at: data.offer_expires_at } : {}),
...(data.joining_date !== undefined ? { joining_date: data.joining_date } : {}),
...(data.interview_link !== undefined ? { interview_link: data.interview_link } : {}),
...(data.interview_type !== undefined ? { interview_type: data.interview_type } : {}),
    } as const;
    const { data: row, error } = await context.supabase
      .from("applications")
      .upsert(patch, { onConflict: "user_id,job_id" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- AI score job vs profile ----------
export const scoreJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("./ai-gateway.server");
    const [{ data: job }, { data: profile }] = await Promise.all([
      context.supabase.from("jobs").select("*").eq("id", data.job_id).maybeSingle(),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (!job) throw new Error("Job not found");
    if (!profile) throw new Error("Profile not found");
    const scored = await aiJson<{
      score: number;
      reasons: string[];
      gaps: string[];
      pitch: string;
    }>({
      system:
        'You are a career coach. Score how well a candidate matches a job from 0-100. Return JSON: { score:int, reasons:[3 short strengths], gaps:[2-3 specific gaps], pitch: "1 paragraph tailored pitch the candidate can use in their application" }. Be specific and honest.',
      user: `JOB:\nTitle: ${job.title}\nCompany: ${job.company}\nLevel: ${job.experience_level}\nDescription: ${job.description}\nRequirements: ${JSON.stringify(job.requirements)}\n\nCANDIDATE:\nHeadline: ${profile.headline ?? ""}\nSummary: ${profile.summary ?? ""}\nSkills: ${JSON.stringify(profile.skills)}\nExperience: ${JSON.stringify(profile.experience)}`,
    });
    // Upsert application with score
    await context.supabase
      .from("applications")
      .upsert(
        {
          user_id: context.userId,
          job_id: data.job_id,
          ai_score: scored.score,
          ai_match_reasons: scored.reasons,
          ai_gaps: scored.gaps,
        },
        { onConflict: "user_id,job_id" },
      );
    // Notification
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: `AI scored ${job.title} at ${job.company}: ${scored.score}/100`,
      body: scored.reasons.join(" • "),
      link: `/jobs/${job.id}`,
      kind: "score",
    });
    return scored;
  });

// ---------- Notes ----------
export const listNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ application_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("notes")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    q = data.application_id ? q.eq("application_id", data.application_id) : q.is("application_id", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        application_id: z.string().uuid().nullable(),
        title: z.string().max(200).nullable(),
        body: z.string().max(10000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("notes")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notes").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Checklists ----------
export const listChecklists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ application_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("checklists")
      .select("*")
      .eq("user_id", context.userId)
      .order("position", { ascending: true });
    q = data.application_id ? q.eq("application_id", data.application_id) : q.is("application_id", null);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        application_id: z.string().uuid().nullable(),
        label: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("checklists")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const toggleChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid(), done: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("checklists")
      .update({ done: data.done })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("checklists")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Notifications ----------
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", context.userId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Filter prefs ----------
export const getFilterPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("filter_prefs")
      .select("filters")
      .eq("user_id", context.userId)
      .maybeSingle();
    return (data?.filters as Filters) ?? {};
  });

export const saveFilterPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => FiltersSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("filter_prefs")
      .upsert({ user_id: context.userId, filters: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Dashboard counts ----------
export const dashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [apps, notifs] = await Promise.all([
      context.supabase.from("applications").select("status").eq("user_id", context.userId),
      context.supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .eq("read", false),
    ]);
    const byStatus: Record<string, number> = {};
    for (const a of apps.data ?? []) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    return {
      total: apps.data?.length ?? 0,
      byStatus,
      unread: notifs.count ?? 0,
    };
  });

// ---------- Adzuna Job Import (service role, no user auth) ----------
export const importAdzunaJobs = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      query: z.string().default("software engineer"),
      location: z.string().default("india"),
      pages: z.number().min(1).max(5).default(2),
    }).parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!appId || !appKey) throw new Error("ADZUNA_APP_ID or ADZUNA_APP_KEY missing");
    if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);

    type AdzunaJob = {
      id: string;
      title: string;
      company: { display_name: string };
      location: { display_name: string };
      description: string;
      redirect_url: string;
      salary_min?: number;
      salary_max?: number;
      contract_time?: string;
      created: string;
      category: { label: string };
    };

    const allJobs: AdzunaJob[] = [];
    for (let page = 1; page <= data.pages; page++) {
      const url = new URL(`https://api.adzuna.com/v1/api/jobs/in/search/${page}`);
      url.searchParams.set("app_id", appId);
      url.searchParams.set("app_key", appKey);
      url.searchParams.set("results_per_page", "20");
      url.searchParams.set("what", data.query);
      url.searchParams.set("where", data.location);
      url.searchParams.set("content-type", "application/json");

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Adzuna error ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const json = await res.json() as { results: AdzunaJob[] };
      allJobs.push(...(json.results ?? []));
    }

    if (allJobs.length === 0) return { inserted: 0, skipped: 0, total_fetched: 0 };

    const rows = allJobs.map((j) => {
      const isRemote = j.location.display_name.toLowerCase().includes("remote") || j.title.toLowerCase().includes("remote");
      const contractMap: Record<string, string> = { full_time: "full_time", part_time: "part_time", contract: "contract" };
      const employmentType = contractMap[j.contract_time ?? ""] ?? "full_time";
      const titleLower = j.title.toLowerCase();
      let experienceLevel = "mid";
      if (titleLower.includes("senior") || titleLower.includes("sr.") || titleLower.includes("lead") || titleLower.includes("principal")) experienceLevel = "senior";
      else if (titleLower.includes("junior") || titleLower.includes("jr.") || titleLower.includes("entry") || titleLower.includes("intern")) experienceLevel = "entry";
      const tags = [j.category.label, ...["react","node","python","java","typescript","aws","docker","sql","ml","ai"].filter(kw => j.description.toLowerCase().includes(kw) || j.title.toLowerCase().includes(kw))].slice(0, 6);
      return {
        title: j.title,
        company: j.company.display_name,
        location: j.location.display_name,
        description: j.description.slice(0, 2000),
        source: "adzuna",
        source_url: j.redirect_url,
        salary_min: j.salary_min ?? null,
        salary_max: j.salary_max ?? null,
        currency: "INR",
        remote: isRemote,
        employment_type: employmentType,
        experience_level: experienceLevel,
        posted_at: j.created,
        tags,
        requirements: [],
      };
    });

    const { data: inserted, error } = await supabase
      .from("jobs")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(error.message);
    return { inserted: inserted?.length ?? 0, skipped: rows.length - (inserted?.length ?? 0), total_fetched: allJobs.length };
  });

// ── importJSearchJobs (RapidAPI / JSearch) ────────────────────────────────────
export const importJSearchJobs = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    z.object({
      query: z.string().default("software engineer"),
      location: z.string().default("India"),
      pages: z.number().min(1).max(5).default(2),
    }).parse(d ?? {})
  )
  .handler(async ({ data }) => {
    const rapidKey = process.env.RAPIDAPI_KEY;
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!rapidKey) throw new Error("RAPIDAPI_KEY missing");
    if (!supabaseUrl || !serviceKey) throw new Error("Supabase env missing");

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, serviceKey);

    type JSearchJob = {
      job_id: string;
      job_title: string;
      employer_name: string;
      job_city: string;
      job_country: string;
      job_description: string;
      job_apply_link: string;
      job_min_salary?: number;
      job_max_salary?: number;
      job_employment_type?: string;
      job_is_remote: boolean;
      job_posted_at_datetime_utc: string;
      job_required_skills?: string[];
      job_highlights?: { Qualifications?: string[] };
    };

    const allJobs: JSearchJob[] = [];

    for (let page = 1; page <= data.pages; page++) {
      const res = await fetch(
        `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(
          `${data.query} in ${data.location}`
        )}&page=${page}&num_pages=1`,
        {
          headers: {
            "x-rapidapi-key": rapidKey,
            "x-rapidapi-host": "jsearch.p.rapidapi.com",
          },
        }
      );
      if (!res.ok) throw new Error(`JSearch error ${res.status}`);
      const json = await res.json() as { data: JSearchJob[] };
      allJobs.push(...(json.data ?? []));
    }

    if (allJobs.length === 0) return { inserted: 0, skipped: 0, total_fetched: 0 };

    const contractMap: Record<string, string> = {
      FULLTIME: "full_time",
      PARTTIME: "part_time",
      CONTRACTOR: "contract",
    };

    const rows = allJobs.map((j) => {
      const titleLower = j.job_title.toLowerCase();
      let experienceLevel = "mid";
      if (titleLower.includes("senior") || titleLower.includes("lead") || titleLower.includes("principal"))
        experienceLevel = "senior";
      else if (titleLower.includes("junior") || titleLower.includes("intern") || titleLower.includes("entry"))
        experienceLevel = "entry";

      const tags = [
        ...(j.job_required_skills ?? []),
        ...["react","node","python","java","typescript","aws","docker","sql","ml","ai"]
          .filter(kw => j.job_description.toLowerCase().includes(kw)),
      ].slice(0, 6);

      return {
        title: j.job_title,
        company: j.employer_name,
        location: [j.job_city, j.job_country].filter(Boolean).join(", "),
        description: j.job_description.slice(0, 2000),
        source: "jsearch",
        source_url: j.job_apply_link,
        salary_min: j.job_min_salary ?? null,
        salary_max: j.job_max_salary ?? null,
        currency: "INR",
        remote: j.job_is_remote,
        employment_type: contractMap[j.job_employment_type ?? ""] ?? "full_time",
        experience_level: experienceLevel,
        posted_at: j.job_posted_at_datetime_utc,
        tags,
        requirements: j.job_highlights?.Qualifications ?? [],
      };
    });

    const { data: inserted, error } = await supabase
      .from("jobs")
      .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
      .select("id");

    if (error) throw new Error(error.message);
    return {
      inserted: inserted?.length ?? 0,
      skipped: rows.length - (inserted?.length ?? 0),
      total_fetched: allJobs.length,
    };
  });

// ---------- Resume Enhancement ----------
export const enhanceResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ text: z.string().min(20).max(50000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("./ai-gateway.server");

    const { data: jobs } = await context.supabase
      .from("jobs")
      .select("title, tags, requirements")
      .limit(50);

    const commonKeywords = [...new Set(
      (jobs ?? []).flatMap((j) => [
        ...(j.tags as string[] ?? []),
        ...(j.requirements as string[] ?? []),
      ])
    )].slice(0, 60).join(", ");

    const result = await aiJson<{
      overall_score: number;
      verdict: string;
      sections: Array<{
        name: string;
        score: number;
        feedback: string;
        suggestion: string;
      }>;
      ats_gaps: string[];
      top_strengths: string[];
      quick_wins: string[];
    }>({
      system: `You are an expert resume coach and ATS specialist. Analyse the resume and return JSON with:
- overall_score: integer 0-100
- verdict: 1 sentence overall assessment
- sections: array of { name, score (0-100), feedback (1 sentence what's weak), suggestion (1 sentence specific fix) } — cover: Summary, Skills, Experience, Education, Formatting
- ats_gaps: array of up to 8 keywords/skills missing from the resume that appear in current job market demand (cross-reference: ${commonKeywords})
- top_strengths: array of 3 specific strengths found in the resume
- quick_wins: array of 3 changes the candidate can make TODAY to improve their score
Be specific, honest, and actionable. No generic advice.`,
      user: data.text,
    });

    return result;
  });

// ---------- Helper: safely extract an array from an unknown AI response ----------
function extractArray<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object") {
    // Groq sometimes wraps: { "results": [...] } or { "jobs": [...] } or { "data": [...] }
    const val = Object.values(result as Record<string, unknown>).find((v) => Array.isArray(v));
    if (val) return val as T[];
  }
  return [];
}

// ---------- Auto-Match Agent ----------
export const runAutoMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ threshold: z.number().min(50).max(100).default(92) }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("./ai-gateway.server");

    // Fetch profile
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found. Complete your profile first.");
    if (!profile.resume_parsed) throw new Error("Parse your resume first so the agent knows your skills.");

    // Fetch jobs NOT yet in this user's applications
    const { data: existing } = await context.supabase
      .from("applications")
      .select("job_id")
      .eq("user_id", context.userId);
    const existingIds = new Set((existing ?? []).map((a) => a.job_id));

    const { data: jobs } = await context.supabase
      .from("jobs")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(200);

    const unseen = (jobs ?? []).filter((j) => !existingIds.has(j.id));
    if (unseen.length === 0) return { scanned: 0, queued: 0, matches: [] };

    const profileSummary = `
Headline: ${profile.headline ?? ""}
Summary: ${profile.summary ?? ""}
Skills: ${JSON.stringify(profile.skills ?? [])}
Experience: ${JSON.stringify((profile.experience as unknown[]) ?? [])}
    `.trim();

    type Match = { job_id: string; title: string; company: string; score: number; pitch: string; source_url: string };
    const matches: Match[] = [];

    // Batch score — 4 at a time to stay within token/rate limits
    const BATCH = 4;
    for (let i = 0; i < unseen.length; i += BATCH) {
      const batch = unseen.slice(i, i + BATCH);

      let scored: Array<{ job_id: string; score: number }> = [];
      try {
        const raw = await aiJson<unknown>({
          system: [
            "You are a career matching engine.",
            "Given a candidate profile and a list of jobs, score each job 0-100 for fit.",
            "Return ONLY a raw JSON array — no wrapper object, no markdown, no explanation.",
            'Example format: [{"job_id":"<uuid>","score":85},{"job_id":"<uuid>","score":42}]',
            "Be strict — 90+ means near-perfect match.",
          ].join(" "),
          user: `CANDIDATE:\n${profileSummary}\n\nJOBS:\n${batch
            .map(
              (j) =>
                `job_id: ${j.id}\ntitle: ${j.title}\ncompany: ${j.company}\ndesc: ${j.description?.slice(0, 400)}\nreqs: ${JSON.stringify(j.requirements ?? [])}`
            )
            .join("\n---\n")}`,
        });
        scored = extractArray<{ job_id: string; score: number }>(raw);
      } catch (e) {
        console.error(`Batch ${i}–${i + BATCH} scoring failed, skipping:`, e);
        continue;
      }

      for (const item of scored) {
        const job_id = item?.job_id;
        const score = item?.score;
        if (typeof score !== "number" || score < data.threshold) continue;
        const job = batch.find((j) => j.id === job_id);
        if (!job) continue;

        // Generate pitch — isolated try/catch so one failure doesn't kill the whole batch
        let pitch = "";
        try {
          const pitchResult = await aiJson<{ pitch: string }>({
            system:
              "Write a 2-sentence tailored cover letter opening for this candidate applying to this job. Return JSON: { pitch: string }. Be specific, confident, no fluff.",
            user: `CANDIDATE:\n${profileSummary}\n\nJOB:\n${job.title} at ${job.company}\n${job.description?.slice(0, 600)}`,
          });
          pitch = pitchResult?.pitch ?? "";
        } catch (e) {
          console.error(`Pitch generation failed for ${job_id}, using empty pitch:`, e);
        }

        matches.push({
          job_id,
          title: job.title,
          company: job.company,
          score,
          pitch,
          source_url: job.source_url ?? "",
        });
      }
    }

    if (matches.length === 0) {
      return { scanned: unseen.length, queued: 0, matches: [] };
    }

    // Upsert all matches as auto_queued applications
    await (context.supabase.from("applications") as any).upsert(
      matches.map((m) => ({
        user_id: context.userId,
        job_id: m.job_id,
        status: "saved",
        ai_score: m.score,
        ai_pitch: m.pitch,
        auto_queued: true,
      })),
      { onConflict: "user_id,job_id" }
    );

    // Single notification
    await context.supabase.from("notifications").insert({
      user_id: context.userId,
      title: `Agent found ${matches.length} high-match job${matches.length > 1 ? "s" : ""}`,
      body: matches.map((m) => `${m.title} @ ${m.company} (${m.score}/100)`).join(" · "),
      link: "/agent",
      kind: "agent",
    });

    return { scanned: unseen.length, queued: matches.length, matches };
  });

// ---------- Get agent queue ----------
export const getAgentQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("applications")
      .select("*, job:jobs(*)")
      .eq("user_id", context.userId)
      .eq("auto_queued", true)
      .eq("status", "saved")
      .order("ai_score", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<Record<string, any>>;
  });

  // ─────────────────────────────────────────────────────────────────────────────
// ADD THESE TO THE BOTTOM OF src/lib/jobgenie.functions.ts
// ─────────────────────────────────────────────────────────────────────────────

// ---------- Get job + application + profile for Prep page ----------
export const getPrepData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: job }, { data: profile }] = await Promise.all([
      context.supabase.from("jobs").select("*").eq("id", data.job_id).maybeSingle(),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (!job) throw new Error("Job not found");

    const { data: application } = await context.supabase
      .from("applications")
      .select("*")
      .eq("user_id", context.userId)
      .eq("job_id", data.job_id)
      .maybeSingle();

    // Load saved prep content if it exists (stored in notes with title = "__prep__")
    const { data: prepNote } = await context.supabase
      .from("notes")
      .select("*")
      .eq("user_id", context.userId)
      .eq("application_id", application?.id ?? "")
      .eq("title", "__prep__")
      .maybeSingle();

let prepContent: PrepContent | null = null;
    if (prepNote?.body) {
      try {
        prepContent = JSON.parse(prepNote.body) as PrepContent;
        const asText = (v: any): string =>
          typeof v === "string" ? v : v?.description ?? v?.task ?? (v ? JSON.stringify(v) : "");
        if (prepContent) {
          prepContent.company_overview = asText(prepContent.company_overview);
          prepContent.culture_notes = asText(prepContent.culture_notes);
          if (Array.isArray(prepContent.doc_checklist)) {
            prepContent.doc_checklist = prepContent.doc_checklist.map((item: any) =>
              typeof item === "string"
                ? item
                : item?.task
                ? (item.description ? `${item.task} — ${item.description}` : item.task)
                : item?.description ?? JSON.stringify(item)
            );
          }
          if (Array.isArray(prepContent.questions)) {
            prepContent.questions = prepContent.questions.map((q: any) => ({
              category: asText(q.category),
              question: asText(q.question),
              hint: asText(q.hint),
            }));
          }
        }
      } catch {
        prepContent = null;
      }
    }

    return { job, application, profile, prepContent };
  });

export type PrepContent = {
  company_overview: string;
  culture_notes: string;
  questions: Array<{ category: string; question: string; hint: string }>;
  doc_checklist: string[];
  generated_at: string;
};

// ---------- Generate full prep content with Groq ----------
export const generatePrepContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [{ data: job }, { data: profile }] = await Promise.all([
      context.supabase.from("jobs").select("*").eq("id", data.job_id).maybeSingle(),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (!job) throw new Error("Job not found");

    // Call Groq directly (fast inference)
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const profileSummary = `
Name: ${profile?.full_name ?? "Candidate"}
Headline: ${profile?.headline ?? ""}
Skills: ${JSON.stringify(profile?.skills ?? [])}
Experience: ${JSON.stringify((profile?.experience as unknown[]) ?? []).slice(0, 800)}
    `.trim();

    const prompt = `You are an expert interview coach. A candidate is preparing for this interview:

JOB: ${job.title} at ${job.company}
LOCATION: ${job.location ?? "Unknown"}
DESCRIPTION: ${(job.description ?? "").slice(0, 1000)}
REQUIREMENTS: ${JSON.stringify(job.requirements ?? [])}

CANDIDATE PROFILE:
${profileSummary}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:
{
  "company_overview": "3-4 sentence paragraph about ${job.company}: what they do, their mission, products/services, and why they matter in the industry. Be specific and factual.",
  "culture_notes": "2-3 sentence paragraph about ${job.company}'s known work culture, values, and what they typically look for in candidates.",
  "questions": [
    {
      "category": "Technical",
      "question": "...",
      "hint": "What to focus on in your answer (1 sentence)"
    }
  ],
  "doc_checklist": ["Government ID", "Printed resume (3 copies)", "..."]
}

Rules:
- questions: exactly 8 questions across these categories: Technical (3), Behavioural (3), Role-Specific (2)
- Each question must be specific to the role and tailored to the candidate's background
- hints must be concrete, not generic ("mention your React experience at X" not "show your skills")
- doc_checklist: 6-8 items relevant to this specific role and company type
- company_overview and culture_notes must name the company explicitly`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
    }

    const groqData = await res.json() as {
      choices: Array<{ message: { content: string } }>;
    };

const raw = groqData.choices[0]?.message?.content ?? "{}";
const parsed = JSON.parse(raw) as PrepContent;

if (Array.isArray(parsed.doc_checklist)) {
  parsed.doc_checklist = parsed.doc_checklist.map((item: any) =>
    typeof item === "string"
      ? item
      : item?.task
      ? (item.description ? `${item.task} — ${item.description}` : item.task)
      : item?.description ?? JSON.stringify(item)
  );
}

const asText = (v: any): string =>
  typeof v === "string" ? v : v?.description ?? v?.task ?? (v ? JSON.stringify(v) : "");
parsed.company_overview = asText(parsed.company_overview);
parsed.culture_notes = asText(parsed.culture_notes);

parsed.generated_at = new Date().toISOString();

    // Persist to notes table so it survives page refreshes
    const { data: application } = await context.supabase
      .from("applications")
      .select("id")
      .eq("user_id", context.userId)
      .eq("job_id", data.job_id)
      .maybeSingle();

    if (application?.id) {
      // Upsert: delete old prep note then insert fresh one
      await context.supabase
        .from("notes")
        .delete()
        .eq("user_id", context.userId)
        .eq("application_id", application.id)
        .eq("title", "__prep__");

      await context.supabase.from("notes").insert({
        user_id: context.userId,
        application_id: application.id,
        title: "__prep__",
        body: JSON.stringify(parsed),
      });
    }

    return parsed;
  });

  // ---------- AI Career Gap Analyzer ----------
export const analyzeCareerGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      text: z.string().min(20).max(50000),
      target_role: z.string().min(2).max(100),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { aiJson } = await import("./ai-gateway.server");

    const result = await aiJson<{
      score: number;
      target_score: number;
      headline: string;
      summary: string;
      skill_breakdown: Array<{ name: string; pct: number; status: "strong" | "partial" | "missing" }>;
      missing_skills: string[];
      hire_probability: number;
      hire_probability_after: number;
      hire_note: string;
      salary_now: string;
      salary_after: string;
      salary_increase_pct: number;
      roadmap: Array<{
        step: number;
        title: string;
        resources: string;
        duration: string;
        difficulty: "Easy" | "Medium" | "Hard";
      }>;
    }>({
      system: `You are a career gap analyst. Analyse the resume against the target role and return JSON with:
- score: integer 0–100 (current match %)
- target_score: integer (projected match % after completing roadmap, always higher than score)
- headline: "You qualify for X% of [role] roles" (1 sentence)
- summary: 2 sentences — what's strong, what's the biggest gap
- skill_breakdown: 6 skills critical for this role, each with name, pct (0–100), status ("strong"/"partial"/"missing")
- missing_skills: 5–7 specific missing keywords/tools
- hire_probability: integer 0–100 (realistic hiring chance today)
- hire_probability_after: integer (after roadmap)
- hire_note: "Add [top skill] → jumps to X%" (1 line)
- salary_now: estimated current salary for this role given candidate level (e.g. "$52,000")
- salary_after: estimated salary after completing roadmap
- salary_increase_pct: integer
- roadmap: exactly 4 steps, each { step, title, resources (specific course/site names), duration ("N weeks"), difficulty }
Be specific to the exact resume content. No generic advice. Use real salary data for the target role.`,
      user: `TARGET ROLE: ${data.target_role}\n\nRESUME:\n${data.text}`,
    });

    return result;
  });

  // ---------- AI Hiring Explainability ----------
// Returns per-skill contribution to the match score — the "why 87%?" breakdown.
export const explainScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ job_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { aiJson } = await import("./ai-gateway.server");

    const [{ data: job }, { data: profile }] = await Promise.all([
      context.supabase.from("jobs").select("*").eq("id", data.job_id).maybeSingle(),
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
    ]);
    if (!job) throw new Error("Job not found");
    if (!profile) throw new Error("Profile not found");

    const result = await aiJson<{
      overall_score: number;
      verdict: string;
      skill_contributions: Array<{
        skill: string;
        delta: number;        // positive = boosts score, negative = drags it
        present: boolean;     // true = candidate has it, false = missing
        weight: "high" | "medium" | "low"; // importance to this specific role
        note: string;         // 1 short sentence — what the recruiter sees
      }>;
      top_boosts: string[];   // 3 skills/traits that most helped the score
      top_gaps: string[];     // 3 specific missing skills/traits
      hiring_likelihood: "very_high" | "high" | "medium" | "low";
      likelihood_reason: string; // 1 sentence
    }>({
      system: `You are an AI hiring explainability engine. Your job is to explain WHY a candidate scores the way they do against a job description — like a recruiter's internal notes made transparent.

Return JSON with:
- overall_score: integer 0-100 (recalculate honestly)
- verdict: 1-sentence plain-English summary ("Strong match — your Python and ML background aligns well but Docker is missing")
- skill_contributions: array of 6-10 skills/traits that matter for this role, each with:
  - skill: name (concise: "Python", "React", "Team lead exp", "System design")
  - delta: integer -25 to +25 (how much this skill moves the score. +20 means it strongly boosts, -10 means it drags)
  - present: boolean (does the candidate actually have this?)
  - weight: "high" | "medium" | "low" (how critical is it for THIS role)
  - note: 1 short sentence a recruiter would say ("5 yrs Python listed — covers core req" or "No Docker mentioned — required in JD")
- top_boosts: 3 strings — specific skills/traits that are biggest positives
- top_gaps: 3 strings — most important missing skills
- hiring_likelihood: "very_high" | "high" | "medium" | "low"
- likelihood_reason: 1 sentence

Be specific to this actual resume + job. Never generic. Use real skill names from the JD and resume.`,
      user: `JOB:
Title: ${job.title}
Company: ${job.company}
Level: ${job.experience_level}
Description: ${job.description?.slice(0, 1500)}
Requirements: ${JSON.stringify(job.requirements ?? [])}
Tags: ${JSON.stringify(job.tags ?? [])}

CANDIDATE:
Headline: ${profile.headline ?? ""}
Summary: ${profile.summary ?? ""}
Skills: ${JSON.stringify(profile.skills ?? [])}
Experience: ${JSON.stringify((profile.experience as unknown[]) ?? []).slice(0, 1000)}
Education: ${JSON.stringify((profile.education as unknown[]) ?? [])}`,
    });

    // Persist to applications table for caching (best-effort)
    await context.supabase
      .from("applications")
      .upsert(
        {
          user_id: context.userId,
          job_id: data.job_id,
          ai_score: result.overall_score,
        },
        { onConflict: "user_id,job_id" },
      )
      .select();

    return result;
  });

  // ---------- Explain match score (Groq) ----------
export const explainMatchScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      jobTitle: z.string(),
      company: z.string(),
      score: z.number(),
      pitch: z.string(),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const prompt = `You are a career AI explaining a job match score to a candidate.

Job: "${data.jobTitle}" at ${data.company}
Overall match score: ${data.score}/100
AI pitch: "${data.pitch || "Not provided"}"

Return ONLY a JSON object (no markdown, no backticks) with this exact shape:
{
  "summary": "One sentence explaining why the score is ${data.score}.",
  "factors": [
    { "skill": "Python", "delta": 20, "reason": "Strong match — 3+ years listed in profile" },
    { "skill": "React", "delta": 15, "reason": "Core skill, heavily used at last role" },
    { "skill": "System Design", "delta": 10, "reason": "Senior role requires this; profile shows experience" },
    { "skill": "Docker", "delta": -8, "reason": "Required by JD but not mentioned in profile" },
    { "skill": "Kubernetes", "delta": -5, "reason": "Nice-to-have; partial match inferred from cloud exp" }
  ],
  "verdict": "One punchy sentence: top thing the candidate should highlight or close the gap on."
}

Make the factors realistic for this job title and score. 4-6 factors total (mix of positive and negative). Deltas should sum to roughly ${data.score} from a 50 base. Be specific, not generic.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const groqData = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = groqData.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as { summary: string; factors: Array<{ skill: string; delta: number; reason: string }>; verdict: string };
  });


  // ─────────────────────────────────────────────────────────────────────────────
// Add to src/lib/jobgenie.functions.ts
// ─────────────────────────────────────────────────────────────────────────────

// ---------- Interview Simulation — ask next question ----------
export const interviewAsk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        // Full transcript so far: [{role: "interviewer"|"candidate", text: "..."}]
        transcript: z
          .array(z.object({ role: z.enum(["interviewer", "candidate"]), text: z.string() }))
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const [{ data: job }, { data: profile }] = await Promise.all([
      context.supabase.from("jobs").select("title,company,description,experience_level").eq("id", data.job_id).maybeSingle(),
      context.supabase.from("profiles").select("headline,skills,experience").eq("id", context.userId).maybeSingle(),
    ]);
    if (!job) throw new Error("Job not found");

    const isFirst = data.transcript.length === 0;

    const systemPrompt = `You are a professional technical interviewer at ${job.company} hiring for "${job.title}" (${job.experience_level ?? "mid"} level).
Job description excerpt: ${(job.description ?? "").slice(0, 600)}
Candidate profile — headline: ${profile?.headline ?? ""}, skills: ${JSON.stringify(profile?.skills ?? [])}.

Your job: ask ONE focused interview question. Progress naturally through the interview:
- Turn 1: "Tell me about yourself." (always start here)
- Turns 2-3: Role-specific technical questions drawn from the JD
- Turns 4-5: Behavioural questions (STAR-format prompts)
- Turn 6+: Deeper follow-ups or scenario questions

Rules:
- Return ONLY the question text — no preamble, no "Great answer!", no filler, no score.
- Keep it under 40 words.
- Vary the category each turn.
- On turn 7+, wrap up politely: "That's all from my end. Thank you for your time, [first word of headline or 'candidate']!"`;

    const messages = [
      ...data.transcript.map((t) => ({
        role: t.role === "interviewer" ? "assistant" : "user",
        content: t.text,
      })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 120,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const groqData = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    return { question: groqData.choices[0]?.message?.content?.trim() ?? "Tell me about yourself." };
  });

// ---------- Interview Simulation — evaluate one answer ----------
export const interviewEvaluate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        question: z.string().min(5).max(500),
        answer: z.string().min(10).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const { data: job } = await context.supabase
      .from("jobs")
      .select("title,company,experience_level")
      .eq("id", data.job_id)
      .maybeSingle();

    const prompt = `You are a senior interviewer evaluating a candidate's answer for "${job?.title ?? "the role"}" at ${job?.company ?? "the company"} (${job?.experience_level ?? "mid"} level).

QUESTION: "${data.question}"
ANSWER: "${data.answer}"

Return ONLY valid JSON (no markdown, no backticks):
{
  "confidence_score": <integer 0-100>,
  "technical_score": <integer 0-100>,
  "communication_score": <integer 0-100>,
  "overall_score": <integer 0-100>,
  "strengths": ["<specific thing done well>", "<another strength>"],
  "improvements": ["<specific, actionable improvement>", "<another improvement>"],
  "sample_answer_snippet": "<The single strongest sentence they should have included — make it specific to this question>"
}

Scoring guide:
- confidence_score: assertiveness, lack of hedging, ownership of experience
- technical_score: correctness, depth, specificity of technical content (0 if question is non-technical)
- communication_score: clarity, structure (STAR method where applicable), conciseness
- overall_score: weighted average, lean on communication + technical

Be honest and specific. No generic feedback like "be more specific" — name what was missing.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const groqData = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = groqData.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      confidence_score: number;
      technical_score: number;
      communication_score: number;
      overall_score: number;
      strengths: string[];
      improvements: string[];
      sample_answer_snippet: string;
    };
  });

// ---------- Interview Simulation — final session debrief ----------
export const interviewDebrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        job_id: z.string().uuid(),
        evaluations: z.array(
          z.object({
            question: z.string(),
            answer: z.string(),
            confidence_score: z.number(),
            technical_score: z.number(),
            communication_score: z.number(),
            overall_score: z.number(),
          }),
        ),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const { data: job } = await context.supabase
      .from("jobs")
      .select("title,company")
      .eq("id", data.job_id)
      .maybeSingle();

    const avgScore = (key: keyof (typeof data.evaluations)[0]) =>
      Math.round(
        data.evaluations.reduce((s, e) => s + (e[key] as number), 0) / (data.evaluations.length || 1),
      );

    const prompt = `You are a career coach debriefing a mock interview for "${job?.title ?? "the role"}" at ${job?.company ?? "the company"}.

SESSION STATS:
- Avg confidence: ${avgScore("confidence_score")}/100
- Avg technical: ${avgScore("technical_score")}/100
- Avg communication: ${avgScore("communication_score")}/100
- Avg overall: ${avgScore("overall_score")}/100
- Questions answered: ${data.evaluations.length}

Return ONLY valid JSON:
{
  "overall_verdict": "<1 punchy sentence — hire / borderline / not yet>",
  "hire_readiness": <integer 0-100>,
  "top_strength": "<The single most impressive thing across all answers>",
  "critical_gap": "<The most important thing to fix before the real interview>",
  "next_steps": ["<specific practice action>", "<specific practice action>", "<specific practice action>"]
}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const groqData = (await res.json()) as { choices: Array<{ message: { content: string } }> };
    const raw = groqData.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      overall_verdict: string;
      hire_readiness: number;
      top_strength: string;
      critical_gap: string;
      next_steps: string[];
    };
  });

  // ---------- Voice Answer Analysis ----------
export const analyzeVoiceAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      job_id: z.string().uuid(),
      question: z.string().min(5).max(500),
      transcript: z.string().min(5).max(5000),
      duration_seconds: z.number(),
      filler_count: z.number(),        // counted client-side from transcript
      word_count: z.number(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    const { data: job } = await context.supabase
      .from("jobs")
      .select("title, company, experience_level")
      .eq("id", data.job_id)
      .maybeSingle();

    const wpm = data.duration_seconds > 0
      ? Math.round((data.word_count / data.duration_seconds) * 60)
      : 0;

    const prompt = `You are an expert interview speech coach evaluating a spoken answer for "${job?.title ?? "the role"}" at ${job?.company ?? "the company"}.

QUESTION: "${data.question}"
SPOKEN ANSWER TRANSCRIPT: "${data.transcript}"

SPEECH METRICS (computed from audio):
- Speaking duration: ${data.duration_seconds}s
- Words per minute: ${wpm} (ideal range: 120–160 WPM)
- Filler words detected (um, uh, like, you know, so): ${data.filler_count}
- Total words: ${data.word_count}

Return ONLY valid JSON (no markdown):
{
  "confidence_score": <0-100>,
  "clarity_score": <0-100>,
  "pace_score": <0-100>,
  "tone_score": <0-100>,
  "overall_score": <0-100>,
  "wpm": ${wpm},
  "wpm_verdict": "<too slow / good pace / too fast>",
  "filler_verdict": "<e.g. '3 fillers — acceptable' or '11 fillers — work on this'>",
  "confidence_notes": "<1 sentence on what signals confidence or lack of it in their word choice>",
  "tone_notes": "<1 sentence — enthusiastic / flat / nervous / assertive>",
  "top_strength": "<most impressive thing about how they spoke>",
  "top_fix": "<single most impactful thing to fix before the real interview>",
  "improved_opening": "<rewrite just their first sentence to sound more confident and clear>"
}

Scoring:
- confidence_score: strong declarative statements, ownership ("I built", "I led" vs "I think maybe I helped")
- clarity_score: logical structure, no rambling, clear conclusion
- pace_score: 100 = 130-160 WPM with natural pauses. Penalize <100 or >180 WPM
- tone_score: professional enthusiasm, not monotone or overly nervous
- overall_score: weighted average (confidence 30%, clarity 30%, pace 20%, tone 20%)`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.3,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) throw new Error(`Groq error ${res.status}`);
    const groqData = await res.json() as { choices: Array<{ message: { content: string } }> };
    const raw = groqData.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      confidence_score: number;
      clarity_score: number;
      pace_score: number;
      tone_score: number;
      overall_score: number;
      wpm: number;
      wpm_verdict: string;
      filler_verdict: string;
      confidence_notes: string;
      tone_notes: string;
      top_strength: string;
      top_fix: string;
      improved_opening: string;
    };
  });