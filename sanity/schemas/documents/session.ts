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
      validation: (rule) => rule.required(),
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
    }),
    defineField({
      name: "signupUrl",
      title: "Sign-up URL",
      type: "url",
      group: "schedule",
      description: "Where attendees reserve a place.",
      hidden: ({ parent }) => parent?.type !== "workshop",
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
  /**
   * Document-level rules, split by severity. See ADR-0003.
   *
   * Errors block publishing and describe a programme that cannot exist: a
   * room hosting two sessions at once, a session outside the conference, a
   * workshop nobody can sign up for. Warnings describe a programme that is
   * merely unfinished. The distinction is not about importance — it is about
   * whether an operator changing a room at 09:40 on the day should be stopped
   * by it.
   */
  validation: (rule) => [
    // --- Errors: the programme would be impossible ---
    rule.custom(async (doc: SessionDocument | undefined, context) => {
      if (!doc) return true;

      const conflicts = await findConflictsInRoom(doc, context);
      if (conflicts.length > 0) {
        return `This room is already in use at that time by ${listTitles(conflicts)}. Two sessions cannot share a room.`;
      }

      if (!(await isInsideEvent(doc, context))) {
        return "This session falls outside the conference dates. Check the event's dates, and remember the Studio shows times in your own timezone.";
      }

      if (doc.type === "workshop") {
        if (!doc.capacity) return "A workshop needs a number of places. Attendees cannot sign up for an unbounded room.";
        if (!doc.signupUrl) return "A workshop needs a sign-up URL, or attendees have no way to reserve a place.";
      }

      if (isInterval(doc.type) && (doc.speakers?.length ?? 0) > 0) {
        return "Breaks and registration have no speakers. Change the type, or remove them.";
      }

      return true;
    }),

    // --- Warnings: the programme is unfinished, not broken ---
    rule
      .custom(async (doc: SessionDocument | undefined, context) => {
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
      state: "liveStatus.state",
      delayMinutes: "liveStatus.delayMinutes",
    },
    prepare(selection) {
      return formatSessionPreview(selection);
    },
  },
});
