import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import tomorrow from "react-syntax-highlighter/dist/cjs/styles/prism/tomorrow";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

const Markdown = (props: Props): JSX.Element => {
  const markdown = matter(props.content);
  return (
    <ReactMarkdown
      remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (inline || !match) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
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
      {markdown.content}
    </ReactMarkdown>
  );
};
export { Markdown };
