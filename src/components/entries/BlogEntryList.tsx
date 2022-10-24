import { Link, Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, } from "@mui/material";
import { BlogMarkdownCardProps } from "./BlogMarkdownCard";

type Props = {
  cards: BlogMarkdownCardProps[];
};


const BlogEntryList = (props: Props): JSX.Element => {
  return (
    <Container maxWidth="xl">
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
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Link href={card.path} color="#000000">
                    <b>
                      {card.frontmatter.title}
                    </b>
                  </Link>
                </TableCell>
                <TableCell >{card.frontmatter.description}</TableCell>
                <TableCell >{`${card.frontmatter.tags.join(", ")}`}</TableCell>
                <TableCell >{card.frontmatter.createdAt}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};
export default BlogEntryList;
