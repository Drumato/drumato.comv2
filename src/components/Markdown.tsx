import { Edit as EditIcon } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction, Chip } from "@mui/material";
import matter, { GrayMatterFile } from "gray-matter";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import tomorrow from "react-syntax-highlighter/dist/cjs/styles/prism/tomorrow";
import remarkGfm from "remark-gfm";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import BlogTags from "./BlogTags";

type Props = {
  markdown: string;
  frontmatter: MarkdownFrontMatter;
};

type CustomReactMarkdownProps = {
  content: string;
};

const CustomReactMarkdown = (props: CustomReactMarkdownProps): JSX.Element => {
  return (
    <ReactMarkdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (inline || !match) {
            return (
              <code
                style={{ backgroundColor: "#ffe6e6" }}
                className={className}
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              customStyle={{ fontFamily: "cursive" }}
              language={match[1]}
              style={tomorrow}
              PreTag="div"
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
      }}
    >
      {props.content}
    </ReactMarkdown>
  );
};

const Markdown = (props: Props): JSX.Element => {
  return (
    <>
      <BottomNavigation showLabels>
        <BottomNavigationAction
          label={`created at ${props.frontmatter.createdAt}`}
          icon={<EditIcon style={{ fontSize: "large" }} />}
        />
      </BottomNavigation>
      <BlogTags tags={props.frontmatter.tags}></BlogTags>
      <CustomReactMarkdown content={props.markdown} />
    </>
  );
};
export { Markdown };
