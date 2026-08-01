import { CalendarIcon } from "@sanity/icons/Calendar";
import { defineField, defineType } from "sanity";

/**
 * The conference itself. A singleton -- one document, created once.
 *
 * It holds the two facts that every other document depends on and that
 * nothing else can supply: the range of dates the programme occupies, and the
 * timezone those dates are expressed in. Sessions store their start as an
 * instant in UTC; without a venue timezone there is no way to say which day
 * an instant belongs to, and "which day is this on" is the first question the
 * schedule has to answer.
 *
 * Conference days are derived from startDate and endDate rather than modelled
 * as their own documents. See ADR-0002.
 */
export const event = defineType({
  name: "event",
  title: "Event",
  type: "document",
  icon: CalendarIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "The conference name, as it appears in the page title.",
    }),
    defineField({
      name: "tagline",
      title: "Tagline",
      type: "string",
      description: "One line, shown beneath the name. Optional.",
    }),
    defineField({
      name: "startDate",
      title: "First day",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
    }),
    defineField({
      name: "endDate",
      title: "Last day",
      type: "date",
      options: { dateFormat: "YYYY-MM-DD" },
      description:
        "Inclusive. A two-day conference ends on its second day, not the morning after.",
    }),
    defineField({
      name: "timezone",
      title: "Venue timezone",
      type: "string",
      description:
        "IANA timezone identifier, such as America/Argentina/Buenos_Aires. Session times are stored as instants and displayed in this zone by default, so changing it moves the entire published programme.",
      initialValue: "America/Argentina/Buenos_Aires",
    }),
    defineField({
      name: "venueName",
      title: "Venue",
      type: "string",
    }),
    defineField({
      name: "city",
      title: "City",
      type: "string",
    }),
  ],
  preview: {
    select: { title: "name", start: "startDate", end: "endDate", city: "city" },
    prepare({ title, start, end, city }) {
      const dates = start && end ? `${start} → ${end}` : "Dates not set";
      return {
        title: title || "Untitled event",
        subtitle: city ? `${dates} · ${city}` : dates,
      };
    },
  },
});
