import { useRouter } from "next/router";
import { Localization, NavBarLinks } from "~/utils/locale/localization";
import {
  SupportedLocale,
  SupportedLocaleEnglish,
} from "~/utils/locale/supported";

type CustomLocale = {
  rawLocale: string;
  localization: Localization;
};

const useLocale = (): CustomLocale => {
  const { locale } = useRouter();
  const l = (locale as SupportedLocale) ?? SupportedLocaleEnglish;

  return {
    rawLocale: l,
    localization: localization(l),
  };
};

const localization = (l: SupportedLocale): Localization => {
  return {
    navBarLinks: {
      post: {
        href: "post",
      },
      diary: {
        href: "diary",
      },
    },
  };
};

export default useLocale;
