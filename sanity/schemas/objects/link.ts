import { defineField, defineType } from "sanity";

/**
 * A labelled external link. Inline, not a document -- a link has no identity
 * or lifecycle of its own and is never referenced from anywhere else.
 */
export const link = defineType({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description:
        "What the link is called. Written out rather than derived from the URL, because “github.com/…” tells a screen-reader user nothing useful.",
      // Required for the reason the description gives: a link with no label
      // has no accessible name.
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "href",
      title: "URL",
      type: "url",
      // A link with no destination renders nothing to follow.
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "href" },
  },
});
