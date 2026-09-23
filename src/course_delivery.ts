import { z } from "zod";
import { generateLessonImage } from "./lesson_image_generation.js";
import type OpenAI from "openai";

const learnerDeadlineSchema = z.object({
  learnerId: z.string().min(1),
  dueAtIso: z.string().datetime(),
  completedAtIso: z.string().datetime().optional()
});

const courseDeliveryRequestSchema = z.object({
  requestId: z.string().min(1),
  courseId: z.string().min(1),
  lessonId: z.string().min(1),
  educatorId: z.string().min(1),
  educatorLabel: z.string().min(1),
  topic: z.string().min(3),
  learnerAgeBand: z.enum(["child", "teen", "adult"]),
  accessibilityNotes: z.string().min(3),
  learners: z.array(learnerDeadlineSchema).min(1),
  reportGeneratedAtIso: z.string().datetime()
});

export type CourseDeliveryRequest = z.infer<typeof courseDeliveryRequestSchema>;

export type LearnerDeliveryStatus = "scheduled" | "due_soon" | "overdue" | "completed";

export type LearnerDeliveryDecision = {
  learnerId: string;
  status: LearnerDeliveryStatus;
};

export type EducatorReport = {
  scheduled: number;
  dueSoon: number;
  overdue: number;
  completed: number;
};

export type CourseDeliveryResult = {
  requestId: string;
  imageUrl: string;
  learnerDecisions: LearnerDeliveryDecision[];
  educatorReport: EducatorReport;
};

export function decideLearnerStatus(
  dueAtIso: string,
  completedAtIso: string | undefined,
  reportGeneratedAtIso: string
): LearnerDeliveryStatus {
  if (completedAtIso) {
    return "completed";
  }

  const dueAt = new Date(dueAtIso).getTime();
  const reportAt = new Date(reportGeneratedAtIso).getTime();
  const hoursUntilDue = (dueAt - reportAt) / (1000 * 60 * 60);

  if (hoursUntilDue < 0) {
    return "overdue";
  }

  if (hoursUntilDue <= 24) {
    return "due_soon";
  }

  return "scheduled";
}

export function summarizeForEducator(
  decisions: LearnerDeliveryDecision[]
): EducatorReport {
  return decisions.reduce<EducatorReport>(
    (acc, decision) => {
      if (decision.status === "scheduled") acc.scheduled += 1;
      if (decision.status === "due_soon") acc.dueSoon += 1;
      if (decision.status === "overdue") acc.overdue += 1;
      if (decision.status === "completed") acc.completed += 1;
      return acc;
    },
    { scheduled: 0, dueSoon: 0, overdue: 0, completed: 0 }
  );
}

export async function deliverCourseArtwork(
  client: OpenAI,
  input: CourseDeliveryRequest
): Promise<CourseDeliveryResult> {
  const parsed = courseDeliveryRequestSchema.parse(input);

  const image = await generateLessonImage(client, {
    courseId: parsed.courseId,
    lessonId: parsed.lessonId,
    learnerAgeBand: parsed.learnerAgeBand,
    topic: parsed.topic,
    accessibilityNotes: parsed.accessibilityNotes,
    educatorLabel: parsed.educatorLabel
  });

  const learnerDecisions = parsed.learners.map((learner) => ({
    learnerId: learner.learnerId,
    status: decideLearnerStatus(
      learner.dueAtIso,
      learner.completedAtIso,
      parsed.reportGeneratedAtIso
    )
  }));

  return {
    requestId: parsed.requestId,
    imageUrl: image.imageUrl,
    learnerDecisions,
    educatorReport: summarizeForEducator(learnerDecisions)
  };
}
