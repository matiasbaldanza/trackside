import { defineField, defineType } from "sanity";

/**
 * What is happening to a session right now, as against what was planned.
 *
 * This is the only part of a session that changes while the conference is
 * running, and it is edited under conditions nothing else is: by a volunteer,
 * on a phone, in a corridor, in seconds. Everything about its shape follows
 * from that -- a small set of states, and the fields each state needs and no
 * others.
 *
 * It is an object on the session rather than a document of its own. A status
 * has no meaning apart from the session it describes, is never referenced,
 * and is only ever read alongside it. Making it a document would add a
 * reference to resolve on the hottest read in the system and a second thing
 * for an operator to find.
 *
 * There is no history. An operator records the current state; a full audit
 * trail implies a retention policy and a reader who wants it, and this system
 * has neither.
 */
export const liveStatus = defineType({
  name: "liveStatus",
  title: "Live status",
  type: "object",
  options: { columns: 2 },
  fields: [
    defineField({
      name: "state",
      title: "State",
      type: "string",
      initialValue: "onTime",
      options: {
        list: [
          { title: "On time", value: "onTime" },
          { title: "Delayed", value: "delayed" },
          { title: "Moved", value: "moved" },
          { title: "Cancelled", value: "cancelled" },
        ],
        layout: "radio",
      },
      description: "Leave as “On time” unless something has actually changed.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "delayMinutes",
      title: "Delay (minutes)",
      type: "number",
      description: "How much later than scheduled the session will start.",
      hidden: ({ parent }) => parent?.state !== "delayed",
      // "Delayed" without a number tells an attendee nothing they did not
      // already suspect from standing outside a closed door.
      validation: (rule) =>
        rule.custom((value, context) => {
          const state = (context.parent as { state?: string } | undefined)?.state;
          if (state !== "delayed") return true;
          if (typeof value !== "number" || value <= 0) return "How many minutes late?";
          return true;
        }),
    }),
    defineField({
      name: "movedToTrack",
      title: "Moved to",
      type: "reference",
      to: [{ type: "track" }],
      description: "The room the session has moved to.",
      hidden: ({ parent }) => parent?.state !== "moved",
      validation: (rule) =>
        rule.custom((value, context) => {
          const state = (context.parent as { state?: string } | undefined)?.state;
          if (state !== "moved") return true;
          return value ? true : "Moved where? Attendees need the new room.";
        }),
    }),
    defineField({
      name: "note",
      title: "Note",
      type: "string",
      description:
        "Shown to attendees alongside the status. Optional, and worth writing when the reason is not obvious from the status alone.",
    }),
    defineField({
      name: "updatedAt",
      title: "Updated",
      type: "datetime",
      readOnly: true,
      description:
        "Set automatically when the status is published. Attendees are told how old a status is, because “delayed” with no timestamp is not information.",
    }),
  ],
});
