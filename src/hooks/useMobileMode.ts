import { useMediaQuery, useTheme } from "@mui/material";

const useMobileMode = (): boolean => {
  const theme = useTheme();
  const isMobileSize = useMediaQuery(theme.breakpoints.down("xs"));

  return isMobileSize;
};

export default useMobileMode;
