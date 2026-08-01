import { ThLargeIcon } from "@sanity/icons/ThLarge";
import { defineField, defineType } from "sanity";

/**
 * A room, and the parallel programme running in it.
 *
 * A document rather than a string on the session because a track is renamed,
 * reordered and referred to independently of any session in it: renaming a
 * room should not mean editing thirty sessions, and the schedule needs a
 * stable identity to filter and to lay out columns against.
 *
 * "Track" and "room" are the same thing here. Conferences that separate them
 * -- a thematic track moving between rooms -- need a third entity; this one
 * does not, and inventing it would model a problem the programme does not
 * have.
 */
export const track = defineType({
  name: "track",
  title: "Track",
  type: "document",
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "As shown in the schedule, for example “Main Hall”.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 40 },
      description:
        "Used in the schedule URL, so /?track=main-hall is shareable. Changing it breaks links that have already been shared.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "shortName",
      title: "Short name",
      type: "string",
      description:
        "Two or three characters for the mobile agenda, where the full name will not fit. Optional; the full name is used when absent.",
    }),
    defineField({
      name: "order",
      title: "Display order",
      type: "number",
      description:
        "Left-to-right position in the timetable. Rooms have a physical arrangement and a hierarchy; alphabetical order respects neither.",
      validation: (rule) => rule.required().integer(),
    }),
    defineField({
      name: "capacity",
      title: "Capacity",
      type: "number",
      description: "Seats. Shown to attendees for rooms that fill up.",
    }),
  ],
  orderings: [
    {
      name: "displayOrder",
      title: "Display order",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "name", order: "order", capacity: "capacity" },
    prepare({ title, order, capacity }) {
      const parts = [
        order !== undefined && order !== null ? `#${order}` : null,
        capacity ? `${capacity} seats` : null,
      ].filter(Boolean);
      return {
        title: title || "Untitled track",
        subtitle: parts.join(" · ") || undefined,
      };
    },
  },
});
