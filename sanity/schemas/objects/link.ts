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
    }),
    defineField({
      name: "href",
      title: "URL",
      type: "url",
    }),
  ],
  preview: {
    select: { title: "label", subtitle: "href" },
  },
});
