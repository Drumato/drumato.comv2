import { Style as StyleIcon } from "@mui/icons-material";
import { Box, Chip } from "@mui/material";
import { useRouter } from "next/router";
import { useState } from "react";

type Props = {
  tags: string[];
};

const BlogTags = (props: Props): JSX.Element => {
  if (props.tags.length === 0) {
    return <></>;
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <StyleIcon style={{ fontSize: "large" }}></StyleIcon>
      {props.tags.map((tag) => {
        return (
          <Chip
            component="a"
            style={{ backgroundColor: "#ffe6e6" }}
            label={tag}
            key={tag}
            href={`/post/tag/${tag}`}
            clickable
          ></Chip>
        );
      })}
    </Box>
  );
};
export default BlogTags;
