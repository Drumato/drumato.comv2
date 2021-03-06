import style from "/public/markdown-styles.module.css";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import tomorrow from "react-syntax-highlighter/dist/cjs/styles/prism/tomorrow";
import remarkGfm from "remark-gfm";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import BlogTags from "./BlogTags";
import rehypeSlug from "rehype-slug";
import BlogEntryNavigation from "./BlogEntryNavigation";
import { EntryKind } from "~/utils/siteLink";
import FacebookShare from "./FacebookShare";
import TwitterShare from "./TwitterShare";
import PocketShare from "./PocketShare";
import HatenaShare from "./HatenaShare";

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

const MarkdownBody = (props: Props): JSX.Element => {
  return (
    <>
      <CustomReactMarkdown content={props.markdown} />
    </>
  );
};

type EntryMarkdownProps = {
  url: string;
  entryKind: EntryKind;
};

const CategoryMarkdown = (props: Props): JSX.Element => {
  return (
    <>
      <h2>{props.frontmatter.title}</h2>
      <hr />
      <CustomReactMarkdown content={props.markdown} />
    </>
  );
};

const EntryMarkdown = (props: Props & EntryMarkdownProps): JSX.Element => {
  return (
    <>
      <h2>{props.frontmatter.title}</h2>
      <BlogEntryNavigation
        createdAt={props.frontmatter.createdAt}
        title={props.frontmatter.title}
        url={props.url}
      />
      <FacebookShare url={props.url} />
      <TwitterShare url={props.url} title={props.frontmatter.title} />
      <PocketShare url={props.url} title={props.frontmatter.title} />
      <HatenaShare url={props.url} title={props.frontmatter.title} />
      <BlogTags tags={props.frontmatter.tags} entryKind={props.entryKind} />
      <hr />
      <CustomReactMarkdown content={props.markdown} />
    </>
  );
};

export { CategoryMarkdown, MarkdownBody, EntryMarkdown };
