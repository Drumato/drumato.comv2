import { useRouter } from "next/router";
import { categories } from "~/locales/category";
import { english } from "~/locales/supported";

type CustomLocale = {
  locale: string;
  categories: Map<string, string>;
};

const useLocale = (): CustomLocale => {
  const { locale } = useRouter();
  const l = locale ?? english;
  return {
    locale: l,
    categories: categories(l),
  };
};

export default useLocale;
