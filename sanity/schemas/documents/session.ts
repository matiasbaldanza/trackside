import { ClockIcon } from "@sanity/icons/Clock";
import { defineArrayMember, defineField, defineType } from "sanity";

import { formatSessionPreview } from "../../lib/scheduling";
import {
  findConflictsInRoom,
  findSpeakerClashes,
  isInsideEvent,
  listTitles,
  type SessionDocument,
} from "../../lib/validation";

/** Types that are intervals rather than programme content. */
const INTERVAL_TYPES = ["break", "registration"];
const isInterval = (type?: string) => INTERVAL_TYPES.includes(type ?? "");

/**
 * A slot in the programme: a talk, a workshop, a panel, or a break.
 *
 * The session is the unit of this system. Speakers and tracks exist so that
 * sessions can refer to them, and the schedule is a view over sessions
 * arranged by time and room.
 *
 * Time is stored as `startsAt` -- an instant, in UTC -- plus a duration in
 * minutes, rather than a start and an end. Programme committees think in
 * durations ("a forty-minute talk"), end times follow from that arithmetic,
 * and overlap detection needs a single source of truth rather than two fields
 * that can disagree. See ADR-0002.
 *
 * Breaks and registration are sessions too. They occupy the grid, they can be
 * delayed, and attendees need to see them. Modelling them separately would
 * mean two things to lay out, two things to reschedule, and two things to
 * query, in exchange for avoiding a few conditional fields.
 */
export const session = defineType({
  name: "session",
  title: "Session",
  type: "document",
  icon: ClockIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "schedule", title: "Schedule" },
    { name: "live", title: "Live" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 80 },
      description:
        "Used in the session URL. Avoid changing it once the programme is public; shared links do not update.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "type",
      title: "Type",
      type: "string",
      group: "content",
      initialValue: "talk",
      options: {
        list: [
          { title: "Talk", value: "talk" },
          { title: "Keynote", value: "keynote" },
          { title: "Workshop", value: "workshop" },
          { title: "Panel", value: "panel" },
          { title: "Break", value: "break" },
          { title: "Registration", value: "registration" },
        ],
      },
      description:
        "Determines which fields apply. Breaks and registration have no speakers and need no abstract.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "abstract",
      title: "Abstract",
      type: "text",
      rows: 5,
      group: "content",
      description: "What the session covers, in the speaker's own framing.",
      hidden: ({ parent }) => isInterval(parent?.type),
      validation: (rule) => [
        rule.max(1500).error("Too long for a schedule listing. Trim it to the essentials."),
        rule.custom((value, context) => {
          const doc = context.document as { type?: string } | undefined;
          if (isInterval(doc?.type)) return true;
          return value ? true : "No abstract yet.";
        }).warning(),
      ],
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
      description:
        "In the order they should be credited. A panel lists its moderator first by convention.",
      hidden: ({ parent }) => isInterval(parent?.type),
      validation: (rule) => [
        // Error: a break with speakers describes something that is not a break.
        rule.custom((value, context) => {
          const doc = context.document as { type?: string } | undefined;
          if (!isInterval(doc?.type)) return true;
          return (value as unknown[] | undefined)?.length
            ? "Breaks and registration have no speakers. Change the type, or remove them."
            : true;
        }),
        // Warnings: the programme is unfinished, not broken. See ADR-0003.
        rule
          .custom(async (_value, context) => {
            const doc = context.document as SessionDocument | undefined;
            if (!doc) return true;

            const clashes = await findSpeakerClashes(doc, context);
            if (clashes.length > 0) {
              const who = clashes[0]?.speakerName;
              return `${who ? `${who} is` : "A speaker is"} also scheduled for ${listTitles(clashes)} at this time.`;
            }

            if (!isInterval(doc.type) && (doc.speakers?.length ?? 0) === 0) {
              return "No speakers yet.";
            }

            return true;
          })
          .warning(),
      ],
    }),
    defineField({
      name: "language",
      title: "Language",
      type: "string",
      group: "content",
      initialValue: "es",
      options: {
        list: [
          { title: "Spanish", value: "es" },
          { title: "English", value: "en" },
        ],
        layout: "radio",
      },
      description:
        "The language the session is delivered in. Attendees filter on this, so it is content rather than an interface setting.",
      hidden: ({ parent }) => isInterval(parent?.type),
    }),
    defineField({
      name: "level",
      title: "Level",
      type: "string",
      group: "content",
      options: {
        list: [
          { title: "Introductory", value: "intro" },
          { title: "Intermediate", value: "intermediate" },
          { title: "Advanced", value: "advanced" },
        ],
      },
      hidden: ({ parent }) => isInterval(parent?.type),
    }),

    defineField({
      name: "track",
      title: "Room",
      type: "reference",
      group: "schedule",
      to: [{ type: "track" }],
      description: "Where the session takes place.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      group: "schedule",
      description:
        "Stored as an instant. The Studio shows it in your own timezone, which may not be the venue's -- check the day before saving.",
      /**
       * The scheduling rules are attached here rather than to the document,
       * so that they appear beneath the field an editor is looking at. A
       * document-level rule shows only in the validation panel, and a message
       * naming the session you collided with is worth nothing if you have to
       * go and find it.
       *
       * They re-run when the room or duration changes too -- Sanity
       * revalidates the whole document -- and the messages name the room and
       * the conflicting session, so they read correctly whichever field
       * caused the collision.
       */
      validation: (rule) => [
        rule.required(),
        rule.custom(async (_value, context) => {
          const doc = context.document as SessionDocument | undefined;
          if (!doc) return true;

          const conflicts = await findConflictsInRoom(doc, context);
          if (conflicts.length > 0) {
            return `This room is already in use at that time by ${listTitles(conflicts)}. Two sessions cannot share a room.`;
          }

          if (!(await isInsideEvent(doc, context))) {
            return "This session falls outside the conference dates. Check the event's dates, and remember the Studio shows times in your own timezone.";
          }

          return true;
        }),
      ],
    }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      type: "number",
      group: "schedule",
      initialValue: 40,
      description: "The end time is derived from this, and is never stored.",
      validation: (rule) => rule.required().integer().min(5).max(600),
    }),
    defineField({
      name: "capacity",
      title: "Places",
      type: "number",
      group: "schedule",
      description: "How many people can attend. Workshops are capped; talks are not.",
      hidden: ({ parent }) => parent?.type !== "workshop",
      validation: (rule) =>
        rule.custom((value, context) => {
          const doc = context.document as { type?: string } | undefined;
          if (doc?.type !== "workshop") return true;
          if (typeof value !== "number" || value <= 0) {
            return "A workshop needs a number of places. Attendees cannot sign up for an unbounded room.";
          }
          return true;
        }),
    }),
    defineField({
      name: "signupUrl",
      title: "Sign-up URL",
      type: "url",
      group: "schedule",
      description: "Where attendees reserve a place.",
      hidden: ({ parent }) => parent?.type !== "workshop",
      validation: (rule) =>
        rule.custom((value, context) => {
          const doc = context.document as { type?: string } | undefined;
          if (doc?.type !== "workshop") return true;
          return value ? true : "A workshop needs a sign-up URL, or attendees have no way to reserve a place.";
        }),
    }),
    defineField({
      name: "recorded",
      title: "Will be recorded",
      type: "boolean",
      group: "schedule",
      initialValue: false,
    }),
    defineField({
      name: "captioned",
      title: "Live captioned",
      type: "boolean",
      group: "schedule",
      initialValue: false,
      description:
        "Attendees who rely on captions plan their day around this, so an unset value is not the same as “no”.",
    }),

    defineField({
      name: "liveStatus",
      title: "Live status",
      type: "liveStatus",
      group: "live",
    }),
  ],
  orderings: [
    {
      name: "startsAtAsc",
      title: "Start time",
      by: [{ field: "startsAt", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      type: "type",
      startsAt: "startsAt",
      durationMinutes: "durationMinutes",
      trackName: "track.name",
      trackShortName: "track.shortName",
      state: "liveStatus.state",
      delayMinutes: "liveStatus.delayMinutes",
    },
    prepare(selection) {
      return formatSessionPreview(selection);
    },
  },
});
