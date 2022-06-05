import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  styled,
  Typography,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";

type BlogMarkdownCardProps = {
  link: string;
  title: string;
  imageLink: string;
  description: string;
  createdAt: string;
};

const StyledTypography = styled(Typography)({
  display: "block",
  justifyContent: "center",
  alignItems: "center",
  fontSize: "10px",
  fontFamily: "Klee One",
});

const BlogMarkdownCard = (props: BlogMarkdownCardProps): JSX.Element => {
  return (
    <Card sx={{ display: "block" }}>
      <CardActionArea href={props.link}>
        <CardMedia component="img" image={props.imageLink} alt={props.title} />
        <CardContent>
          <StyledTypography gutterBottom variant="h1">
            {props.title}
          </StyledTypography>
          <StyledTypography variant="subtitle1" color="text.secondary">
            {props.description}
            <br />
            <CalendarMonthIcon />
            {props.createdAt}
          </StyledTypography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default BlogMarkdownCard;
export type { BlogMarkdownCardProps };
