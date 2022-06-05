import { english } from "./supported";

const about = "about";
const contacts = "contacts";
const disclaimer = "disclaimer";
const license = "license";
const post = "post";
const diary = "diary";

const englishCategories: Map<string, string> = new Map([
  [about, about],
  [contacts, contacts],
  [disclaimer, disclaimer],
  [license, license],
  [post, post],
  [diary, diary],
]);

const japaneseCategories: Map<string, string> = new Map([
  [about, about],
  [contacts, contacts],
  [disclaimer, "免責事項"],
  [license, "ライセンス"],
  [post, "記事一覧"],
  [diary, "日記一覧"],
]);

const categories = (locale: string): Map<string, string> => {
  return locale === english ? englishCategories : japaneseCategories;
};

export { categories };
