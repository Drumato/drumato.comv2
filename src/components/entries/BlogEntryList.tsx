import {
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { BlogMarkdownCardProps } from "./BlogMarkdownCard";

type Props = {
  cards: BlogMarkdownCardProps[];
};

const BlogEntryList = (props: Props): JSX.Element => {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="entries">
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Tags</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.cards.map((card) => (
            <TableRow
              key={card.frontmatter.title}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                <Link href={card.path} color="#000000">
                  <Typography fontFamily={"Klee One"}>
                    <b>{card.frontmatter.title}</b>
                  </Typography>
                </Link>
              </TableCell>
              <TableCell>
                <Typography fontFamily={"Klee One"}>
                  {card.frontmatter.description}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily={"Klee One"}>
                  {`${card.frontmatter.tags.join(", ")}`}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily={"Klee One"}>
                  {card.frontmatter.createdAt}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default BlogEntryList;
