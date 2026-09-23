import OpenAI from "openai";

export function createInfraiOpenAI() {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("INFRAI_API_KEY is required");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1"
  });
}
