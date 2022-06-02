import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";
import fs from "fs";

const extractMarkdownFrontMatter = (
  markdown: GrayMatterFile<string>
): MarkdownFrontMatter => {
  return { createdAt: markdown.data.createdAt };
};

export { extractMarkdownFrontMatter };
