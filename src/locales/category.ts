import { english } from "./supported";

const categoryAbout = "about";
const categoryContacts = "contacts";
const categoryDisclaimer = "disclaimer";
const categoryLicense = "license";
const categoryPost = "post";
const categoryDiary = "diary";

const englishCategories: Map<string, string> = new Map([
  [categoryAbout, categoryAbout],
  [categoryContacts, categoryContacts],
  [categoryDisclaimer, categoryDisclaimer],
  [categoryLicense, categoryLicense],
  [categoryPost, categoryPost],
  [categoryDiary, categoryDiary],
]);

const japaneseCategories: Map<string, string> = new Map([
  [categoryAbout, categoryAbout],
  [categoryContacts, categoryContacts],
  [categoryDisclaimer, "免責事項"],
  [categoryLicense, "ライセンス"],
  [categoryPost, "記事一覧"],
  [categoryDiary, "日記一覧"],
]);

const categories = (locale: string): Map<string, string> => {
  return locale === english ? englishCategories : japaneseCategories;
};

export {
  categoryAbout,
  categoryContacts,
  categoryDisclaimer,
  categoryLicense,
  categoryPost,
  categoryDiary,
  categories,
};
