import { ClockIcon } from "@sanity/icons/Clock";
import { defineArrayMember, defineField, defineType } from "sanity";

import { formatSessionPreview } from "../../lib/scheduling";

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
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      group: "content",
      options: { source: "title", maxLength: 80 },
      description:
        "Used in the session URL. Avoid changing it once the programme is public; shared links do not update.",
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
    }),
    defineField({
      name: "abstract",
      title: "Abstract",
      type: "text",
      rows: 5,
      group: "content",
      description: "What the session covers, in the speaker's own framing.",
      hidden: ({ parent }) => parent?.type === "break" || parent?.type === "registration",
    }),
    defineField({
      name: "speakers",
      title: "Speakers",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "reference", to: [{ type: "speaker" }] })],
      description:
        "In the order they should be credited. A panel lists its moderator first by convention.",
      hidden: ({ parent }) => parent?.type === "break" || parent?.type === "registration",
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
      hidden: ({ parent }) => parent?.type === "break" || parent?.type === "registration",
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
      hidden: ({ parent }) => parent?.type === "break" || parent?.type === "registration",
    }),

    defineField({
      name: "track",
      title: "Room",
      type: "reference",
      group: "schedule",
      to: [{ type: "track" }],
      description: "Where the session takes place.",
    }),
    defineField({
      name: "startsAt",
      title: "Starts at",
      type: "datetime",
      group: "schedule",
      description:
        "Stored as an instant. The Studio shows it in your own timezone, which may not be the venue's -- check the day before saving.",
    }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      type: "number",
      group: "schedule",
      initialValue: 40,
      description: "The end time is derived from this, and is never stored.",
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
