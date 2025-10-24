import type { Question } from "../game/types";

const BASE_URL = import.meta.env.VITE_ILIAD_BASE_URL;
const ILIAD_API_KEY = import.meta.env.VITE_ILIAD_API_KEY;

const DEPLOYMENT = import.meta.env.VITE_ILIAD_DEPLOYMENT;
const CHAT_API_VERSION = import.meta.env.VITE_ILIAD_API_VERSION;

const _SYSTEM_PROMPT =
  "You are a question generator for a Who Wants to Be a Millionaire style quiz. " +
  "Return strictly and only valid JSON matching the schema explained below."

function _buildPrompt(categories: string[], difficulties: string[], nonce: string): string {
  const catStr = categories.length > 0 ? categories.join(", ") : "General Knowledge";
  const count = difficulties.length;
  return (
    _SYSTEM_PROMPT +
    "Generate fresh, non-repeating questions for the following requirements.\n" +
    `- Number of questions: ${count}\n` +
    `- Allowed categories: ${catStr}\n` +
    `- Difficulties in order: ${difficulties.join(", ")}\n` +
    `- Randomization nonce: ${nonce}\n\n` +
    "Rules:\n" +
    "- Each question must have exactly 4 choices.\n" +
    "- correctIndex is the 0-based index of the correct choice.\n" +
    "- Use varied subtopics and wording; avoid repeating questions, choices, or facts.\n" +
    "- Randomize choices order and vary correctIndex across the set.\n" +
    "- category must be one from the allowed list; distribute categories for variety.\n" +
    "- Keep prompts short and clear; no explanations.\n\n" +
    "Output JSON object with a single field 'questions' that is an array of objects with keys: " +
    "id (string), category (string), difficulty (string), prompt (string), choices (string[4]), correctIndex (number).\n" +
    "Example: {\"questions\": [{\"id\": \"q1\", \"category\": \"Science\", \"difficulty\": \"easy\", \"prompt\": \"What is H2O?\", \"choices\": [\"Water\", \"Oxygen\", \"Hydrogen\", \"Helium\"], \"correctIndex\": 0}]}\n" +
    "Return only JSON."
  );
}

export async function get_direct_questions(categories: string[] = []): Promise<Question[]> {
  // Difficulty curve: 1-5 easy, 6-10 medium, 11-15 hard
  const difficulties = [
    "easy","easy","easy","easy","easy",
    "medium","medium","medium","medium","medium",
    "hard","hard","hard","hard","hard",
  ];
  // Shuffle categories a bit for variety
  const cats = [...categories];
  if (cats.length > 1) cats.sort(() => Math.random() - 0.5);
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const prompt = _buildPrompt(cats, difficulties, nonce);
  const url = `${BASE_URL.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${encodeURIComponent(CHAT_API_VERSION)}`;
  const body = {
    model: DEPLOYMENT,
    messages: [
      { role: 'system', content: _SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.9,
    top_p: 0.95,
    response_format: { type: 'json_object' },
  } as const;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'api-key': ILIAD_API_KEY,
  };
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`LLM error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  const raw = String(data?.choices?.[0]?.message?.content ?? '').trim();
  if (!raw) throw new Error('Empty LLM response');
  const items = parseQuestionsJson(raw);
  const out: Question[] = [];
  const seenPrompts = new Set<string>();
  const usedIds = new Set<string>();
  for (let i = 0; i < items.length && i < difficulties.length; i++) {
    const q = items[i] || {};
    const choices: any[] = Array.isArray(q.choices) ? q.choices : [];
    if (choices.length !== 4) continue;
    const idx = Number.isInteger(q.correctIndex) ? Number(q.correctIndex) : 0;
    if (idx < 0 || idx > 3) continue;
    const promptText = String(q.prompt ?? q.question ?? '').trim();
    if (!promptText) continue;
    const normPrompt = promptText.toLowerCase();
    if (seenPrompts.has(normPrompt)) continue;
    seenPrompts.add(normPrompt);
    let id = String(q.id ?? `llm-${nonce}-${i+1}`);
    if (usedIds.has(id)) id = `${id}-${i+1}`;
    usedIds.add(id);
    out.push({
      id,
      category: String(q.category ?? (categories[i % Math.max(1, categories.length)] || 'General Knowledge')),
      difficulty: String(q.difficulty ?? difficulties[i]) as any,
      prompt: promptText,
      choices: choices.map((c) => String(c)),
      correctIndex: idx,
    });
  }
  if (!out.length) throw new Error('No valid questions returned');
  return out;
}

function parseQuestionsJson(raw: string): any[] {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
  }
  const obj = JSON.parse(text);
  if (Array.isArray(obj)) return obj;
  if (obj && Array.isArray(obj.questions)) return obj.questions;
  throw new Error('Invalid LLM JSON');
}

export async function get_explanation(
  prompt: string,
  choices: string[],
  correctIndex: number,
  userIndex?: number,
  style: string = 'concise'
): Promise<string> {
  if (!prompt || !Array.isArray(choices) || choices.length < 2) {
    throw new Error('prompt and >=2 choices required')
  }
  const system =
    'You are a helpful quiz host. In 1–2 short sentences, explain why the correct answer is right. ' +
    'Avoid spoilers for future questions, keep it upbeat and concise.'
  const parts: string[] = []
  parts.push(`Question: ${prompt}`)
  parts.push('Choices:')
  for (let i = 0; i < choices.length; i++) {
    const letter = String.fromCharCode(65 + i)
    parts.push(`${letter}) ${choices[i]}`)
  }
  parts.push(`Correct index: ${correctIndex}`)
  if (typeof userIndex === 'number' && Number.isFinite(userIndex)) {
    parts.push(`User chose index: ${userIndex}`)
  }
  parts.push(`Style: ${style}`)
  const user_msg = parts.join('\n')

  const url = `${BASE_URL.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${encodeURIComponent(CHAT_API_VERSION)}`
  const body = {
    model: DEPLOYMENT,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user_msg },
    ],
    temperature: 0.6,
  } as const
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'api-key': ILIAD_API_KEY,
  }
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '')
    throw new Error(`LLM error: ${resp.status} ${txt}`)
  }
  const data = await resp.json()
  const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new Error('Empty explanation')
  return text
}

// Example: get_direct_questions(["Science", "History"]);
