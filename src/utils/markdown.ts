import fs from "fs";
import path from "path";
import matter, { GrayMatterFile } from "gray-matter";
import { MarkdownFrontMatter } from "~/@types/Markdown";

/**
 * A Next.js path that identifies an entry of the markdown.
 * @remarks it's used in some page components that lists the entries.
 */
type MarkdownPath = {
  params: {
    id: string;
  };
  locale: string;
};

/**
 * A Next.js path sequence that lists the entries of the markdown.
 * @remarks it's used in some page components that lists the entries of tha markdown.
 */
type MarkdownPaths = {
  paths: MarkdownPath[];
  fallback: boolean;
};

/**
 * A markdown representation that is used for rendering an markdown as HTMl.
 */
type MarkdownEntry = {
  /** for extracting its ID */
  fileName: string;
  frontmatter: MarkdownFrontMatter;
  markdown: GrayMatterFile<string>;
};

/**
 * parses a markdown file that has explicitly defined frontmatter.
 * @param filePath - the parse-target markdown-file
 * @returns an entry of the markdown
 */
const parseMarkdownEntry = (filePath: string): MarkdownEntry => {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const md = matter(content);
  const frontmatter = extractMarkdownFrontMatter(md);

  return {
    fileName: path.basename(filePath),
    frontmatter: frontmatter,
    markdown: md,
  };
};

/**
 * parses the list of the markdowns to entries.
 * @param dirName - the directory that holds parse-target markdown-files
 * @returns an sequence of the entry
 */
const parseMarkdownEntries = (dirName: string): MarkdownEntry[] => {
  const onlyMD = (fileName: string) => path.extname(fileName) === ".md";
  const fileNames = fs.readdirSync(dirName);
  const entries = fileNames.filter(onlyMD).map((fileName) => {
    const filePath = path.join(dirName, fileName);
    return parseMarkdownEntry(filePath);
  });

  return entries;
};

/**
 * sorts the markdown list in descending of the entry's createdAt.
 * @param entries - the list of the markdown entry
 * @returns the sorted list of the given entries
 */
const sortMarkdownEntriesAsFresh = (
  entries: MarkdownEntry[]
): MarkdownEntry[] => {
  const sortedEntries = entries.sort((a, b) => {
    const aAge = Date.parse(a.frontmatter.createdAt);
    const bAge = Date.parse(b.frontmatter.createdAt);
    return bAge - aAge;
  });

  return sortedEntries;
};

/**
 * setup the id list of the markdown for getStaticPaths.
 * @param locale - the page's locale of the path
 * @param dirName - the source directory of the page paths
 * @returns the page paths
 */
const getPathsFromMarkdownDir = (
  locale: string,
  dirName: string
): MarkdownPaths => {
  const extractID = (fileName: string) => path.basename(fileName, ".md");
  const entries = parseMarkdownEntries(dirName);
  const ids = entries.map((entry) => extractID(entry.fileName));
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

/**
 * casts markdown as ours frontmatter.
 * @param markdown - the markdown that holds the raw frontmatter
 * @returns the frontmatter that is explicitly defined for our usecase
 */
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

/**
 * filter markdown entries with the given tag.
 * @param entries - the target markdowns
 * @param tag - the tag that is useds as an filter
 * @returns the filtered entreies
 */
const filterEntriesWithTag = (
  entries: MarkdownEntry[],
  tag: string
): MarkdownEntry[] => {
  return entries.filter((entry) => entry.frontmatter.tags.includes(tag));
};

export {
  parseMarkdownEntries,
  extractMarkdownFrontMatter,
  getPathsFromMarkdownDir,
  parseMarkdownEntry,
  sortMarkdownEntriesAsFresh,
  filterEntriesWithTag,
};

export type { MarkdownEntry };
