const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function aiJson<T = unknown>(opts: {
  system: string;
  user: string;
}): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY missing");

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
if (!res.ok) {
  const body = await res.text();
  console.error("Groq Error:", res.status, body);

  if (res.status === 429) {
    throw new Error(
      `Groq 429: ${body.slice(0, 200)}`
    );
  }

  throw new Error(
    `AI error ${res.status}: ${body.slice(0, 200)}`
  );
}    if (res.status === 401) throw new Error("GROQ_API_KEY invalid.");
    throw new Error(`AI error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}