import test from "node:test";
import assert from "node:assert/strict";
import { decideLearnerStatus, summarizeForEducator } from "../src/course_delivery.js";

test("deadline rules classify learners for educator reporting", () => {
  const reportGeneratedAtIso = "2026-09-09T09:00:00.000Z";

  const decisions = [
    {
      learnerId: "learner-a",
      status: decideLearnerStatus("2026-09-11T09:00:00.000Z", undefined, reportGeneratedAtIso)
    },
    {
      learnerId: "learner-b",
      status: decideLearnerStatus("2026-09-10T08:00:00.000Z", undefined, reportGeneratedAtIso)
    },
    {
      learnerId: "learner-c",
      status: decideLearnerStatus("2026-09-08T20:00:00.000Z", undefined, reportGeneratedAtIso)
    },
    {
      learnerId: "learner-d",
      status: decideLearnerStatus(
        "2026-09-09T12:00:00.000Z",
        "2026-09-09T08:30:00.000Z",
        reportGeneratedAtIso
      )
    }
  ];

  assert.deepEqual(decisions, [
    { learnerId: "learner-a", status: "scheduled" },
    { learnerId: "learner-b", status: "due_soon" },
    { learnerId: "learner-c", status: "overdue" },
    { learnerId: "learner-d", status: "completed" }
  ]);

  assert.deepEqual(summarizeForEducator(decisions), {
    scheduled: 1,
    dueSoon: 1,
    overdue: 1,
    completed: 1
  });
});
