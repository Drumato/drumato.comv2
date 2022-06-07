import style from "/public/markdown-styles.module.css";
import { Edit as EditIcon } from "@mui/icons-material";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import tomorrow from "react-syntax-highlighter/dist/cjs/styles/prism/tomorrow";
import remarkGfm from "remark-gfm";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import BlogTags from "./BlogTags";
import rehypeSlug from "rehype-slug";

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
      className={style.reactMarkDown}
      remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
      rehypePlugins={[rehypeSlug]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (inline || !match) {
            return (
              <code
                {...props}
                style={{
                  backgroundColor: "#ffe6e6",
                  fontFamily: "M PLUG 1p",
                  fontStyle: "italic",
                }}
                className={className}
              >
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              language={match[1]}
              style={tomorrow}
              showLineNumbers={true}
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
      <h2>{props.frontmatter.title}</h2>
      <BottomNavigation showLabels>
        <BottomNavigationAction
          label={`created at ${props.frontmatter.createdAt}`}
          icon={<EditIcon style={{ fontSize: "large" }} />}
        />
      </BottomNavigation>
      <BlogTags tags={props.frontmatter.tags}></BlogTags>
      <hr />
      <CustomReactMarkdown content={props.markdown} />
    </>
  );
};
export { Markdown };
