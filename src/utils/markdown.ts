import fs from "fs";
import path from "path";
import { GrayMatterFile } from "gray-matter";
import { GetStaticPaths } from "next";
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
  const fileNames = fs.readdirSync(dirName);
  const extractID = (fileName: string): string => {
    // note that path.basename will remove the extension
    // if the optional 2nd arg is given.
    const id = path.basename(fileName, ".md");
    return id;
  };

  const ids = fileNames.map((fileName) => {
    return extractID(fileName);
  });

  return ids;
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
    fallback: true,
  };
};

const extractMarkdownFrontMatter = (
  markdown: GrayMatterFile<string>
): MarkdownFrontMatter => {
  return { createdAt: markdown.data.createdAt };
};

export {
  extractMarkdownFrontMatter,
  listIDFromMarkdownDir,
  getPathsFromMarkdownDir,
};
