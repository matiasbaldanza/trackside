import { CalendarIcon } from "@sanity/icons/Calendar";
import { ClockIcon } from "@sanity/icons/Clock";
import { ThLargeIcon } from "@sanity/icons/ThLarge";
import { UserIcon } from "@sanity/icons/User";
import type { StructureResolver } from "sanity/structure";

/** The event is a singleton, so its id is fixed rather than generated. */
export const EVENT_DOCUMENT_ID = "event";

/**
 * The Studio's navigation.
 *
 * The default structure lists every document type, which would offer an
 * editor a "create Event" button for a document that must exist exactly once.
 * Pinning the event to a known id turns it into a single item that opens
 * straight into the editor, so there is no list to browse and no second event
 * to create by accident.
 *
 * Sessions are ordered by start time rather than by title. The list is read
 * as a schedule far more often than it is searched.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Programme")
    .items([
      S.listItem()
        .title("Event")
        .icon(CalendarIcon)
        .child(S.document().schemaType("event").documentId(EVENT_DOCUMENT_ID).title("Event")),

      S.divider(),

      S.listItem()
        .title("Sessions")
        .icon(ClockIcon)
        .child(
          S.documentTypeList("session")
            .title("Sessions")
            .defaultOrdering([{ field: "startsAt", direction: "asc" }]),
        ),

      S.listItem()
        .title("Rooms")
        .icon(ThLargeIcon)
        .child(
          S.documentTypeList("track")
            .title("Rooms")
            .defaultOrdering([{ field: "order", direction: "asc" }]),
        ),

      S.listItem()
        .title("Speakers")
        .icon(UserIcon)
        .child(
          S.documentTypeList("speaker")
            .title("Speakers")
            .defaultOrdering([{ field: "name", direction: "asc" }]),
        ),
    ]);
