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
   * The event is a singleton. Removing its create and delete actions is what
   * actually enforces that -- the custom structure only hides the list; it
   * does not stop a second event being created through search or a direct
   * URL.
   */
  document: {
    actions: (previous, { schemaType }) =>
      schemaType === "event"
        ? previous.filter(({ action }) => action !== "duplicate" && action !== "delete")
        : previous,
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
