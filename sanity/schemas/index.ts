import type { SchemaTypeDefinition } from "sanity";

import { event } from "./documents/event";
import { session } from "./documents/session";
import { speaker } from "./documents/speaker";
import { track } from "./documents/track";
import { link } from "./objects/link";
import { liveStatus } from "./objects/liveStatus";

/**
 * The schema registry.
 *
 * Four documents and two objects. The split is not stylistic: a document has
 * an identity, a lifecycle and things that refer to it; an object is part of
 * whatever contains it and has none of those.
 */
export const schemaTypes: SchemaTypeDefinition[] = [
  // Documents
  event,
  track,
  speaker,
  session,
  // Objects
  link,
  liveStatus,
];
