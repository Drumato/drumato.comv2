import { useRouter } from "next/router";

type CustomLocale = {
  locale: string;
};

const useLocale = (): CustomLocale => {
  const { locale } = useRouter();
  return {
    locale: locale ?? "en",
  };
};

export default useLocale;
