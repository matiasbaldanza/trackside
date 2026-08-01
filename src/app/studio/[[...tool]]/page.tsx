/**
 * Sanity Studio, mounted at /studio.
 *
 * The optional catch-all segment lets the Studio own its own routing: every
 * path below /studio resolves here and the Studio decides what to render.
 *
 * The Studio itself is rendered through a client boundary -- see Studio.tsx
 * for why that boundary has to exist.
 */
import Studio from "./Studio";

export const dynamic = "force-static";

export { metadata, viewport } from "next-sanity/studio";

export default function StudioPage() {
  return <Studio />;
}
