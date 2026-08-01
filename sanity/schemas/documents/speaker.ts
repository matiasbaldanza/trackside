import { UserIcon } from "@sanity/icons/User";
import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * Someone presenting. Referenced by sessions, never embedded in them.
 *
 * A speaker frequently appears in more than one session -- a talk and a panel,
 * or a workshop repeated on both days -- and their biography and portrait
 * should be written once. Embedding them in the session would duplicate the
 * content and let the copies drift.
 */
export const speaker = defineType({
  name: "speaker",
  title: "Speaker",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: "As the speaker wishes to be credited.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "jobTitle",
      title: "Role",
      type: "string",
      description: "For example “Staff Engineer”. Shown beside the name.",
    }),
    defineField({
      name: "organisation",
      title: "Organisation",
      type: "string",
    }),
    defineField({
      name: "photo",
      title: "Portrait",
      type: "image",
      options: { hotspot: true },
      description:
        "Cropped to a square in the interface. Set the hotspot so the crop keeps the face centred.",
      /**
       * A warning, never an error: a speaker is often confirmed weeks before
       * they send a photograph, and the programme has to be publishable in
       * the meantime. See ADR-0003.
       *
       * `rule.warning(message)` alone sets the severity of a rule set without
       * adding a constraint to it, so it always passes. The check has to be
       * the `custom` callback; `.warning()` only decides how it is reported.
       */
      validation: (rule) => rule.custom((value) => (value ? true : "No portrait yet.")).warning(),
      fields: [
        defineField({
          name: "alt",
          title: "Alternative text",
          type: "string",
          description:
            "Describe the image for anyone who cannot see it. For a portrait this is usually the speaker's name, which is why it is not filled in automatically -- if the image shows something else, that matters.",
        }),
      ],
    }),
    defineField({
      name: "bio",
      title: "Biography",
      type: "array",
      description:
        "A short paragraph or two. Deliberately limited: no headings, no images, no embedded media. A biography is prose, and richer formatting here would make the speaker list inconsistent.",
      validation: (rule) =>
        rule
          .custom((value) => ((value as unknown[] | undefined)?.length ? true : "No biography yet."))
          .warning(),
      of: [
        defineArrayMember({
          type: "block",
          styles: [{ title: "Paragraph", value: "normal" }],
          lists: [],
          marks: {
            decorators: [
              { title: "Emphasis", value: "em" },
              { title: "Strong", value: "strong" },
            ],
            annotations: [
              defineArrayMember({
                name: "link",
                type: "object",
                title: "Link",
                fields: [defineField({ name: "href", type: "url", title: "URL" })],
              }),
            ],
          },
        }),
      ],
    }),
    defineField({
      name: "links",
      title: "Links",
      type: "array",
      description: "Personal site, or profiles the speaker wants credited.",
      of: [defineArrayMember({ type: "link" })],
    }),
  ],
  preview: {
    select: {
      title: "name",
      jobTitle: "jobTitle",
      organisation: "organisation",
      media: "photo",
    },
    prepare({ title, jobTitle, organisation, media }) {
      const subtitle = [jobTitle, organisation].filter(Boolean).join(", ");
      return {
        title: title || "Unnamed speaker",
        subtitle: subtitle || undefined,
        media,
      };
    },
  },
});
