import { z } from "zod";
import type OpenAI from "openai";

const lessonImagePromptSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  learnerAgeBand: z.enum(["child", "teen", "adult"]),
  topic: z.string().min(3),
  accessibilityNotes: z.string().min(3),
  educatorLabel: z.string().min(1)
});

export type LessonImagePrompt = z.infer<typeof lessonImagePromptSchema>;

export type LessonImageAsset = {
  prompt: string;
  imageUrl: string;
};

export function buildLessonImagePrompt(input: LessonImagePrompt): string {
  const parsed = lessonImagePromptSchema.parse(input);
  return [
    `Create a course illustration for ${parsed.educatorLabel}.`,
    `Topic: ${parsed.topic}.`,
    `Audience: ${parsed.learnerAgeBand}.`,
    `Accessibility: ${parsed.accessibilityNotes}.`,
    "No faces. No identifying details. Clean educational setting."
  ].join(" ");
}

export async function generateLessonImage(
  client: OpenAI,
  input: LessonImagePrompt
): Promise<LessonImageAsset> {
  const prompt = buildLessonImagePrompt(input);

  const result = await client.images.generate({
    model: "auto",
    prompt,
    size: "1024x1024"
  });

  const imageUrl = result.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Image generation returned no URL");
  }

  return { prompt, imageUrl };
}
