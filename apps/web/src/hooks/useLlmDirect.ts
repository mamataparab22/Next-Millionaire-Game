import type { Question } from "../game/types";

const BASE_URL = "https://api-epic.ir-gateway.abbvienet.com/iliad"; 
const ILIAD_API_KEY = "RlgQp6a8hyH18wgy54hBXN1POUSPRAEd"; 

const DEPLOYMENT = "gpt-4o";
const CHAT_API_VERSION = "2023-07-01-preview";

const _SYSTEM_PROMPT = 
    "You are a question generator for a Who Wants to Be a Millionaire style quiz. " +
    "Return strictly and only valid JSON matching the schema explained below."

function _buildPrompt(categories: string[], difficulties: string[]): string {
    const catStr = categories.length > 0 ? categories.join(", ") : "General Knowledge";
    const count = difficulties.length;
    return (_SYSTEM_PROMPT +
        "Generate questions for the following requirements.\n" +
        `- Number of questions: ${count}\n` +
        `- Allowed categories: ${catStr}\n` +
        `- Difficulties in order: ${difficulties.join(", ")}\n\n` +
        "Rules:\n" +
        "- Each question must have exactly 4 choices.\n" +
        "- correctIndex is the 0-based index of the correct choice.\n" +
        "- category must be one from the allowed list.\n" +
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
  const prompt = _buildPrompt(categories, difficulties);
  const url = `${BASE_URL.replace(/\/$/, '')}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=${encodeURIComponent(CHAT_API_VERSION)}`;
  const body = {
    model: DEPLOYMENT,
    messages: [
      { role: 'system', content: _SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
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
  for (let i = 0; i < items.length && i < difficulties.length; i++) {
    const q = items[i] || {};
    const choices: any[] = Array.isArray(q.choices) ? q.choices : [];
    if (choices.length !== 4) continue;
    const idx = Number.isInteger(q.correctIndex) ? Number(q.correctIndex) : 0;
    if (idx < 0 || idx > 3) continue;
    out.push({
      id: String(q.id ?? `llm-${i+1}`),
      category: String(q.category ?? (categories[i % Math.max(1, categories.length)] || 'General Knowledge')),
      difficulty: String(q.difficulty ?? difficulties[i]) as any,
      prompt: String(q.prompt ?? q.question ?? ''),
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

// Example: get_direct_questions(["Science", "History"]);
