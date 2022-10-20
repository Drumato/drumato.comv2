import { useMediaQuery } from "@chakra-ui/react";
import { drumatoTheme } from "~/pages/_app";

const useMobileMode = (): boolean => {
  const [isDesktop] = useMediaQuery(
    `(min-width: ${drumatoTheme.breakpoints.md})`
  );

  return !isDesktop;
};

export default useMobileMode;
