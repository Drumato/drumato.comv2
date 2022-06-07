import { Container, Grid } from "@mui/material";
import BlogMarkdownCard, { BlogMarkdownCardProps } from "./BlogMarkdownCard";
type BlogCardGridProps = {
  cards: BlogMarkdownCardProps[];
};

const BlogCardGrid = (props: BlogCardGridProps): JSX.Element => {
  return (
    <Container maxWidth="xl">
      <Grid
        container
        direction="row"
        alignItems="stretch"
        spacing={2}
        columns={{ xs: 1, sm: 2, lg: 3, xl: 3 }}
      >
        {props.cards.map((card) => {
          return (
            <Grid item key={card.link} xs={1} lg={1} xl={1}>
              <BlogMarkdownCard
                link={card.link}
                frontmatter={card.frontmatter}
              />
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};
export default BlogCardGrid;
