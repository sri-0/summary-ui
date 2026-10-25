import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** dayjs with the plugins the app uses, configured once. */
export { dayjs };

/** The browser's IANA time zone, sent with every date query so the server
 *  buckets days the way the user sees them. */
export const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
