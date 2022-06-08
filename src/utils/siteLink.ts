import path from "path";

const drumatoBaseURL = "https://www.drumato.com";

type EntryKind = "post" | "diary";

const entryKindDiary: EntryKind = "diary";
const entryKindPost: EntryKind = "post";

/**
 *
 * @param locale {en, ja}
 * @param category {about, license, disclaimer, contacts, post, diary}
 * @returns /{locale}/{category}
 */
const categoryPath = (locale: string, category: string): string => {
  return path.join(`/${locale}`, category);
};

/**
 *
 * @param locale {en, ja}
 * @param category {about, license, disclaimer, contacts, post, diary}
 * @returns https://www.drumato.com/{locale}/{category}
 */
const categoryLink = (locale: string, category: string): string => {
  return drumatoBaseURL + categoryPath(locale, category);
};

/**
 *
 * @param locale {en, ja}
 * @param entryKind {diary, post}
 * @param entryID the name of tha post/diary entry
 * @returns https://www.drumato.com/{locale}/{entryKind}/{entryID}
 */
const entryContentLink = (
  locale: string,
  entryKind: EntryKind,
  entryID: string
): string => {
  return drumatoBaseURL + entryContentPath(locale, entryKind, entryID);
};

/**
 *
 * @param locale {en, ja}
 * @param entryKind {diary, post}
 * @param entryID the name of tha post/diary entry
 * @returns /{locale}/{entryKind}/{entryID}
 */
const entryContentPath = (
  locale: string,
  entryKind: EntryKind,
  entryID: string
): string => {
  return path.join(categoryPath(locale, entryKind), entryID);
};

/**
 *
 * @param locale {en, ja}
 * @param entryKind {diary, post}
 * @param entryID the name of tha post/diary entry
 * @returns https://www.drumato.com/{locale}/{entryKind}/{entryID}
 */
const tagSearchLink = (
  locale: string,
  entryKind: EntryKind,
  tag: string
): string => {
  return drumatoBaseURL + tagSearchPath(locale, entryKind, tag);
};

/**
 *
 * @param locale {en, ja}
 * @param entryKind {post, diary}
 * @param tag the tag of the list in the markdown frontmatter.
 * @returns https://www.drumato.com/{locale}/{entryKind}/tag/{tag}
 */
const tagSearchPath = (
  locale: string,
  entryKind: EntryKind,
  tag: string
): string => {
  return path.join(categoryPath(locale, entryKind), "tag", tag);
};

export {
  drumatoBaseURL,
  entryContentLink,
  entryContentPath,
  entryKindDiary,
  entryKindPost,
  tagSearchPath,
  tagSearchLink,
  categoryPath,
  categoryLink,
};

export type { EntryKind };
