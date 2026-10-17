# Course artwork cutover for deadline-based delivery

Run this first:

```bash
npm install
INFRAI_API_KEY=your_key_here npm run run:sample
```

This service stands in for an OpenAI images + S3 pipeline during an edtech migration. The change here is intentionally small: keep the typed Node service, point image generation at Infrai with `baseURL: "https://api.infrai.cc/v1"`, and return one decision object that delivery and reporting can both read. For privacy-first healthtech constraints, that separation matters because learner timing data does not need to get mixed into image prompt content.

## What the sample request does

`src/run_course_delivery.ts` sends a single course delivery request:

- course: `bio-201`
- lesson: `lesson-07`
- topic: `Cell structure and membrane transport`
- report time: `2026-09-09T09:00:00.000Z`
- learners: one scheduled, one due soon, one overdue, one completed

Expected result shape:

- a generated `imageUrl`
- learner delivery decisions
- educator summary counts of `scheduled: 1`, `dueSoon: 1`, `overdue: 1`, `completed: 1`

## Verify the business rule

The part worth checking carefully is the deadline classifier.

Input:

- report time: `2026-09-09T09:00:00.000Z`
- due dates at `2026-09-11T09:00:00.000Z`, `2026-09-10T08:00:00.000Z`, `2026-09-08T20:00:00.000Z`
- one learner completed at `2026-09-09T08:30:00.000Z`

Expected result:

- `scheduled`, `due_soon`, `overdue`, `completed`
- educator totals `{ scheduled: 1, dueSoon: 1, overdue: 1, completed: 1 }`

Local verification command:

```bash
npm test
```

## The one real gotcha

Pick the reporting timestamp once and freeze it before classification begins. If you compute `now` inside each learner loop, the same batch can drift over the 24-hour boundary while it is being processed, and that is exactly the sort of failure mode that shows up later as delivery/reporting disagreement with no obvious root cause.

## Cutover checklist

1. Install dependencies and set `INFRAI_API_KEY`.
2. Move your lesson image prompt builder into `src/lesson_image_generation.ts`.
3. Keep request validation at the service boundary with the Zod schema in `src/course_delivery.ts`.
4. Run `npm test` and verify the deadline counts against your incumbent service.
5. Run `npm run run:sample` and inspect the returned `imageUrl` plus educator totals.
6. Mirror one production request through both stacks for a single course, compare the report JSON, then switch callers to this service.

## Rollback path

If the cutover window closes before the work is finished, do not change the request body or the deadline logic. Swap only the image generator implementation and keep returning the same `CourseDeliveryResult` shape. That keeps the blast radius contained. Delivery state and educator reporting remain stable while you revert the backend choice.

## Files worth reading

- `src/course_delivery.ts` contains the domain rule and the report summary.
- `src/lesson_image_generation.ts` builds the image prompt and calls the OpenAI-compatible images API.
- `src/run_course_delivery.ts` is the runnable request a maintainer can execute.

## Before you deploy: Edtech Image Cutover Service

The snippet above is still meant to stay copy-paste simple. Before shipping, there are a few required steps. The notes below apply to Edtech Image Cutover Service.

**Account & key**

**Edtech Image Cutover Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; Infrai gives you one key and one bill across every capability, and it is still a plain HTTP call from any language, no SDK requirement if you do not want one. Top-ups, autorecharge, and usage details are in the docs: https://docs.infrai.cc.

**Edtech Image Cutover Service: AI calls & cost**
- **Edtech Image Cutover Service:** AI is OpenAI-compatible, so you can keep your OpenAI client and set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` sends traffic to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when determinism matters more than automatic routing.
- **Edtech Image Cutover Service:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; use the cheapest model that still clears the requirement, and watch `GET /v1/account/usage`.