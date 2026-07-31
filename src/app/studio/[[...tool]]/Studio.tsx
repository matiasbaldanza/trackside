"use client";

/**
 * Client boundary for the Studio.
 *
 * `sanity.config.ts` is imported here rather than from the page because the
 * page is a Server Component, and importing the config there pulls the whole
 * `sanity` package into the React Server Components graph. Under the
 * `react-server` export condition some of its dependencies resolve to
 * server-only builds -- `swr` exports no default there, which Sanity's
 * validation utilities import -- and the route fails to compile.
 *
 * The Studio is a client application in every meaningful sense, so this is
 * the boundary being drawn where it actually belongs.
 */
import { NextStudio } from "next-sanity/studio";

import config from "../../../../sanity.config";

export default function Studio() {
  return <NextStudio config={config} />;
}
