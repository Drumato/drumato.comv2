type createdAt = `${number}-${number}-${number}`;
type MarkdownFrontMatter = {
  createdAt: createdAt;
  title: string;
  tags: string[];
};

export { MarkdownFrontMatter, createdAt };
