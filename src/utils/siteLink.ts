import path from "path";

const drumatoBaseURL = "https://www.drumato.com";
type EntryKind = "post" | "diary";
const entryKindDiary: EntryKind = "diary";
const entryKindPost: EntryKind = "post";

const categoryPath = (locale: string, category: string): string => {
  return path.join(`/${locale}`, category);
};

const categoryLink = (locale: string, category: string): string => {
  return drumatoBaseURL + categoryPath(locale, category);
};

const entryContentLink = (
  locale: string,
  entryKind: EntryKind,
  entryID: string
): string => {
  return drumatoBaseURL + entryContentPath(locale, entryKind, entryID);
};

const entryContentPath = (
  locale: string,
  entryKind: EntryKind,
  entryID: string
): string => {
  return path.join(categoryPath(locale, entryKind), entryID);
};

const tagSearchLink = (
  locale: string,
  entryKind: EntryKind,
  tag: string
): string => {
  return drumatoBaseURL + tagSearchPath(locale, entryKind, tag);
};

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
