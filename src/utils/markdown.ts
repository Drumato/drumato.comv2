import fs from "fs";
import path from "path";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";

type MarkdownPath = {
  params: {
    id: string;
  };
  locale: string;
};

type MarkdownPaths = {
  paths: MarkdownPath[];
  fallback: boolean;
};

const listIDFromMarkdownDir = (dirName: string): string[] => {
  const fileNames = fs.readdirSync(dirName, { encoding: "utf-8" });
  const mdFileNames = fileNames.filter((fileName) => {
    return path.extname(fileName) == ".md";
  });

  // note that path.basename will remove the extension
  // if the optional 2nd arg is given.
  const ids = mdFileNames.map((fileName) => {
    return path.basename(fileName, ".md");
  });

  return ids;
};

type MarkdownEntry = {
  fileName: string;
  frontmatter: MarkdownFrontMatter;
  markdown: GrayMatterFile<string>;
};

const readMarkdownsFromDir = (dirName: string): MarkdownEntry[] => {
  const fileNames = fs.readdirSync(dirName);
  const entries = fileNames.map((fileName) => {
    const id = path.basename(fileName, ".md");
    const filePath = path.join(dirName, fileName);
    const content = fs.readFileSync(filePath, { encoding: "utf-8" });
    const md = matter(content);
    const frontmatter = extractMarkdownFrontMatter(md);
    return {
      fileName: fileName,
      frontmatter: frontmatter,
      markdown: md,
    };
  });
  return entries;
};

const getPathsFromMarkdownDir = (
  locale: string,
  dirName: string
): MarkdownPaths => {
  const ids = listIDFromMarkdownDir(dirName);
  const paths = ids.map((id) => ({
    params: {
      id: id,
    },
    locale: locale,
  }));

  return {
    paths: paths,
    fallback: false,
  };
};

const extractMarkdownFrontMatter = (
  markdown: GrayMatterFile<string>
): MarkdownFrontMatter => {
  return {
    createdAt: markdown.data.createdAt,
    title: markdown.data.title,
    tags: markdown.data.tags,
    imageLink: markdown.data.imageLink,
    description: markdown.data.description,
  };
};

export {
  readMarkdownsFromDir,
  extractMarkdownFrontMatter,
  getPathsFromMarkdownDir,
};
export type { MarkdownEntry };
