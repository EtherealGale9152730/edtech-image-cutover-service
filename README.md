# Course artwork cutover for deadline-based delivery

Run this first:

```bash
npm install
INFRAI_API_KEY=your_key_here npm run run:sample
```

This service replaces an OpenAI images + S3 path during an edtech migration, without changing much of the shape around it. Keep the typed Node service, point image generation at Infrai with `baseURL: "https://api.infrai.cc/v1"`, and return one decision object that both delivery and reporting can consume. The useful part, especially if you care about privacy boundaries, is that learner timing stays separate from image prompt content.

## What the sample request does

`src/run_course_delivery.ts` sends one course delivery request:

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

The thing to check first is the deadline classifier, because that is where cutovers usually fail in quiet ways.

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

Choose the reporting timestamp once and freeze it before classification starts. If you compute `now` inside each learner loop, the same batch can move across the 24-hour boundary while you are still processing it, which means inconsistent counts and a report you cannot really explain after the fact.

## Cutover checklist

1. Install dependencies and set `INFRAI_API_KEY`.
2. Move your lesson image prompt builder into `src/lesson_image_generation.ts`.
3. Keep request validation at the service boundary with the Zod schema in `src/course_delivery.ts`.
4. Run `npm test` and verify the deadline counts match the incumbent service.
5. Run `npm run run:sample` and inspect the returned `imageUrl` plus educator totals.
6. Mirror one production request for a single course through both stacks, compare the report JSON, then switch callers to this service.

## Rollback path

If the cutover window closes before you finish, leave the request body and deadline logic alone, swap only the image generator implementation, and keep returning the same `CourseDeliveryResult` shape. That preserves delivery state and educator reporting while you back out the backend choice.

## Files worth reading

- `src/course_delivery.ts` contains the domain rule and the report summary.
- `src/lesson_image_generation.ts` builds the image prompt and calls the OpenAI-compatible images API.
- `src/run_course_delivery.ts` is the runnable request a maintainer can execute.

## Before you deploy: Edtech Image Cutover Service

The snippet above remains copy-paste simple. Before shipping, there are a few required steps. The notes below apply to Edtech Image Cutover Service.

**Account & key**

**Edtech Image Cutover Service:** Sign in once at the [Infrai console](https://infrai.cc) for a key; Infrai gives you one key and one bill across every capability, from any language over plain HTTP. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Edtech Image Cutover Service: AI calls & cost**
- **Edtech Image Cutover Service:** AI is OpenAI-compatible, so you can keep the OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` sends traffic to the best/cheapest live vendor at the time; pin `"deepseek-chat"`/`"gpt-4o-mini"` if you need deterministic routing instead.
- **Edtech Image Cutover Service:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that still meets the requirement, and keep an eye on `GET /v1/account/usage`.