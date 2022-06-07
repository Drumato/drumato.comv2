import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  styled,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { MarkdownFrontMatter } from "~/@types/Markdown";

type BlogMarkdownCardProps = {
  link: string;
  frontmatter: MarkdownFrontMatter;
};

const StyledTypography = styled(Typography)({
  display: "block",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: "Klee One",
  fontSize: "large",
});

const BlogMarkdownCard = (props: BlogMarkdownCardProps): JSX.Element => {
  return (
    <Card sx={{ display: "block" }}>
      <CardActionArea href={props.link}>
        <CardMedia
          component="img"
          image={props.frontmatter.imageLink}
          alt={props.frontmatter.title}
        />
        <CardContent>
          <StyledTypography gutterBottom variant="h1">
            {props.frontmatter.title}
          </StyledTypography>
          <StyledTypography variant="subtitle1" color="text.secondary">
            {props.frontmatter.description}
            <br />
            <CalendarMonthIcon />
            {props.frontmatter.createdAt}
          </StyledTypography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default BlogMarkdownCard;
export type { BlogMarkdownCardProps };
