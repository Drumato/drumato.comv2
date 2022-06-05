import { Style as StyleIcon } from "@mui/icons-material";
import { Box, Chip } from "@mui/material";

type Props = {
  tags: string[];
};

const BlogTags = (props: Props): JSX.Element => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <StyleIcon style={{ fontSize: "large" }}></StyleIcon>
      {props.tags.map((tag) => {
        return (
          <Chip
            style={{ backgroundColor: "#ffe6e6" }}
            label={tag}
            key={tag}
          ></Chip>
        );
      })}
    </Box>
  );
};
export default BlogTags;
