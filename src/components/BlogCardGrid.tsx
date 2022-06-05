import { Box, Grid } from "@mui/material";
import BlogMarkdownCard, { BlogMarkdownCardProps } from "./BlogMarkdownCard";
type BlogCardGridProps = {
  cards: BlogMarkdownCardProps[];
};

const BlogCardGrid = (props: BlogCardGridProps): JSX.Element => {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {props.cards.map((card) => {
          return (
            <Grid item key={card.link} xs={4}>
              <BlogMarkdownCard
                link={card.link}
                title={card.title}
                imageLink={card.imageLink}
                description={card.description}
                createdAt={card.createdAt}
              />
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};
export default BlogCardGrid;
