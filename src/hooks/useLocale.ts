import { useRouter } from "next/router";
import { categories } from "~/locales/category";

type CustomLocale = {
  categories: Map<string, string>;
};

const useLocale = (): CustomLocale => {
  const { locale } = useRouter();
  return {
    categories: categories(locale),
  };
};

export default useLocale;
