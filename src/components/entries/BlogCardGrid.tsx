import { Container, Grid } from "@mui/material";
import BlogMarkdownCard, { BlogMarkdownCardProps } from "./BlogMarkdownCard";
type BlogCardGridProps = {
  cards: BlogMarkdownCardProps[];
};

const BlogCardGrid = (props: BlogCardGridProps): JSX.Element => {
  return (
    <Container maxWidth="xl">
      <Grid container direction="row" alignItems="stretch" spacing={3}>
        {props.cards.map((card) => {
          return (
            <Grid item key={card.link} xs={4} lg={3}>
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
    </Container>
  );
};
export default BlogCardGrid;
