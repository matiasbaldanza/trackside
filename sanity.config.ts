import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { sanityConfig } from "@/lib/env";
import { schemaTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

/**
 * Sanity Studio, served by the Next.js application at /studio.
 *
 * See docs/decisions/0001-embed-sanity-studio-in-the-next-application.md for
 * why the Studio lives here rather than in a project of its own -- including
 * the argument against, which is Sanity's own default.
 */
export default defineConfig({
  name: "trackside",
  title: "trackside",

  projectId: sanityConfig.projectId,
  dataset: sanityConfig.dataset,

  /** Must match the route the Studio is mounted on. */
  basePath: "/studio",

  schema: {
    types: schemaTypes,
  },

  /**
   * The event is a singleton, and enforcing that takes two separate things.
   *
   * Removing duplicate and delete stops the document being copied or removed
   * once it exists. That alone is not enough: the global create menu would
   * still offer "Event" and produce a second one with a generated id, which
   * the custom structure would then never show. Removing it from the new
   * document options closes that path.
   */
  document: {
    actions: (previous, { schemaType }) =>
      schemaType === "event"
        ? previous.filter(({ action }) => action !== "duplicate" && action !== "delete")
        : previous,

    newDocumentOptions: (previous) =>
      previous.filter((template) => template.templateId !== "event"),
  },

  plugins: [
    structureTool({ structure }),
    /**
     * Vision runs GROQ queries against the dataset from inside the Studio.
     * Included because queries here encode scheduling rules, and being able
     * to check one against real content beats reasoning about it.
     */
    visionTool({ defaultApiVersion: sanityConfig.apiVersion }),
  ],
});
