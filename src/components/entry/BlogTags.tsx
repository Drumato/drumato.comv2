import { Style as StyleIcon } from "@mui/icons-material";
import { Box, Chip } from "@mui/material";
import useLocale from "~/hooks/useLocale";
import { EntryKind, tagSearchPath } from "~/utils/siteLink";

type Props = {
  tags: string[];
  entryKind: EntryKind;
};

const BlogTags = (props: Props): JSX.Element => {
  const loc = useLocale();
  if (props.tags.length === 0) {
    return <></>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <StyleIcon style={{ fontSize: "large" }}></StyleIcon>
      {props.tags.map((tag) => {
        const tagPath = tagSearchPath(loc.rawLocale, props.entryKind, tag);
        return (
          <Chip
            component="a"
            style={{ backgroundColor: "#ffe6e6" }}
            label={tag}
            key={tag}
            href={tagPath}
            clickable
          ></Chip>
        );
      })}
    </Box>
  );
};
export default BlogTags;
