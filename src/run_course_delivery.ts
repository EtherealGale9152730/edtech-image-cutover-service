import { createInfraiOpenAI } from "./infrai_openai.js";
import { deliverCourseArtwork } from "./course_delivery.js";

async function main() {
  const infrai = createInfraiOpenAI();

  const result = await deliverCourseArtwork(infrai, {
    requestId: "cutover-bio-lesson-2026-09-09",
    courseId: "bio-201",
    lessonId: "lesson-07",
    educatorId: "edu-44",
    educatorLabel: "Grade 8 cell biology",
    topic: "Cell structure and membrane transport",
    learnerAgeBand: "teen",
    accessibilityNotes: "High contrast shapes, simple labels, no handwriting.",
    learners: [
      {
        learnerId: "learner-a",
        dueAtIso: "2026-09-11T09:00:00.000Z"
      },
      {
        learnerId: "learner-b",
        dueAtIso: "2026-09-09T18:00:00.000Z"
      },
      {
        learnerId: "learner-c",
        dueAtIso: "2026-09-08T18:00:00.000Z"
      },
      {
        learnerId: "learner-d",
        dueAtIso: "2026-09-09T12:00:00.000Z",
        completedAtIso: "2026-09-09T08:20:00.000Z"
      }
    ],
    reportGeneratedAtIso: "2026-09-09T09:00:00.000Z"
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
