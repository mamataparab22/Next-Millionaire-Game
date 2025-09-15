import { HumanMessage } from "@langchain/core/messages";
import { AzureChatOpenAI } from "@langchain/openai";

const BASE_URL = "https://api-epic.ir-gateway.abbvienet.com/iliad"; 
const ILIAD_API_KEY = "RlgQp6a8hyH18wgy54hBXN1POUSPRAEd"; 

const model = new AzureChatOpenAI({
  azureOpenAIApiKey: ILIAD_API_KEY,
  azureOpenAIApiDeploymentName: "gpt-4o",
  azureOpenAIApiVersion: "2023-07-01-preview",
  azureOpenAIEndpoint: BASE_URL,
});

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

async function get_direct_questions(categories: string[] = []) {
  try {
    // first 5 difficulties = easy, next 5 = medium, last 5 = hard    
    const difficulties = ["easy", "easy", "easy", "easy", "easy", "medium", "medium", "medium", "medium", "medium", "hard", "hard", "hard", "hard", "hard"];
    const prompt = _buildPrompt(categories, difficulties);
    const message = new HumanMessage({ content: prompt });
    const completion = await model.invoke([message]);
    console.log(completion.content);
  } catch (error) {
    console.error("Error invoking the model:", error);
  }
}

// get_direct_questions(["Science", "History"]);
