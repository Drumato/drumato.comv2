type createdAt = `${number}-${number}-${number}`;
type MarkdownFrontMatter = {
  createdAt: createdAt;
  title: string;
  tags: string[];
  description: string;
  imageLink: string;
};

export { MarkdownFrontMatter, createdAt };
