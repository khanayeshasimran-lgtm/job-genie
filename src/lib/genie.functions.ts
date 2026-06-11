import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const CAREER_INTENTS = [
  "prioritization",
  "follow-up",
  "follow up",
  "interview",
  "resume",
  "profile",
  "offer",
  "salary",
  "application",
  "job",
  "apply",
  "skill",
  "gap",
  "prepare",
  "prep",
  "career",
  "next step",
  "what should",
  "help me",
  "advice",
  "improve",
  "focus",
  "pending",
  "attention",
  "schedule",
  "deadline",
  "score",
  "match",
];

function isCareerRelated(message: string): boolean {
  const lower = message.toLowerCase();
  return CAREER_INTENTS.some((kw) => lower.includes(kw));
}

export const askGenie = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        message: z.string().min(1).max(2000),
        // Optional: pass prior turns so Genie has conversation memory within a session
        history: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .default([]),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY missing");

    // ── Guard: career-only ────────────────────────────────────────────────────
    if (!isCareerRelated(data.message)) {
      return {
        response:
          "I'm Genie — your career agent. I'm focused on helping you with your job search, applications, interviews, and career decisions. Ask me something like: *What should I do today?* or *Help me prepare for my interview.*",
      };
    }

    // ── Fetch context in parallel ─────────────────────────────────────────────
    const [profileRes, applicationsRes, savedJobsRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select(
          "full_name, headline, location, summary, skills, experience, education, completeness, resume_parsed"
        )
        .eq("id", context.userId)
        .maybeSingle(),

      context.supabase
        .from("applications")
        .select(
          "status, interview_at, offer_expires_at, joining_date, assessment_due_at, next_action_at, next_action_label, ai_score, ai_match_reasons, ai_gaps, job:jobs(title, company, location, experience_level)"
        )
        .eq("user_id", context.userId)
        .order("updated_at", { ascending: false })
        .limit(30),

      context.supabase
        .from("saved_jobs")
        .select("job:jobs(title, company, location)")
        .eq("user_id", context.userId)
        .limit(10),
    ]);

    const profile = profileRes.data;
    const applications = applicationsRes.data ?? [];
    const savedJobs = savedJobsRes.data ?? [];

    // ── Derived slices ────────────────────────────────────────────────────────
    const interviews = applications.filter((a) => a.status === "interviewing");
    const offers = applications.filter((a) => a.status === "offer");
    const pending = applications.filter(
      (a) =>
        a.next_action_at &&
        new Date(a.next_action_at) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    );

    const now = new Date().toISOString();

    const careerContext = {
      today: now.slice(0, 10),
      profile: profile
        ? {
            name: profile.full_name,
            headline: profile.headline,
            location: profile.location,
            skills: profile.skills,
            completeness: profile.completeness,
            resume_parsed: profile.resume_parsed,
            experience_count: Array.isArray(profile.experience)
              ? profile.experience.length
              : 0,
          }
        : null,
      applications: {
        total: applications.length,
        by_status: applications.reduce<Record<string, number>>((acc, a) => {
          acc[a.status] = (acc[a.status] ?? 0) + 1;
          return acc;
        }, {}),
        interviews: interviews.map((a) => ({
          job: a.job,
          interview_at: a.interview_at,
          assessment_due_at: a.assessment_due_at,
        })),
        offers: offers.map((a) => ({
          job: a.job,
          offer_expires_at: a.offer_expires_at,
          joining_date: a.joining_date,
        })),
        pending_actions: pending.map((a) => ({
          job: a.job,
          action: a.next_action_label,
          due: a.next_action_at,
        })),
        top_matches: applications
          .filter((a) => a.ai_score && a.ai_score >= 80)
          .slice(0, 5)
          .map((a) => ({
            job: a.job,
            score: a.ai_score,
            reasons: a.ai_match_reasons,
          })),
      },
      saved_jobs: savedJobs.map((s) => s.job),
    };

    // ── Build messages ────────────────────────────────────────────────────────
    const systemPrompt = `You are Genie, an AI career agent inside JobGenie — a job search platform.

Your role: help the user make smart decisions about their job search using ONLY the career data provided.

Behaviour rules:
- Be concise. Max 4-5 sentences unless the user explicitly asks for more.
- Be actionable. Always end with a clear next step or recommendation.
- Be specific. Reference actual job titles, companies, and dates from the context — never generic advice.
- Never make up information not present in the context.
- If the context lacks data to answer well, say so honestly and suggest what the user should do inside the app.
- You may use light markdown (bold, bullet points) for clarity.
- Today's date: ${now.slice(0, 10)}

Supported intents:
1. Prioritization — which jobs/actions to focus on
2. Follow-ups — what needs attention, deadlines approaching
3. Interview prep — coach for upcoming interviews
4. Resume/profile advice — gaps, improvements
5. Offer advice — deadlines, comparisons, decisions

Career context:
${JSON.stringify(careerContext, null, 2)}`;

    const messages = [
      ...data.history.slice(-6), // Keep last 3 exchanges for context
      { role: "user" as const, content: data.message },
    ];

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 600,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`);
    }

    const groqData = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const response =
      groqData.choices[0]?.message?.content?.trim() ??
      "Sorry, I couldn't generate a response. Please try again.";

    return { response };
  });