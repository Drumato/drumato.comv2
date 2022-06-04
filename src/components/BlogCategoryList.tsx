import BlogCategory from "./BlogCategory";

type BlogCategoryListProps = {
  categories: string[];
  categoryBaseDir: string;
};

const BlogCategoryList = (props: BlogCategoryListProps): JSX.Element => {
  return (
    <>
      {props.categories.map((category) => {
        return (
          <BlogCategory
            key={category}
            categoryBaseDir={props.categoryBaseDir}
            name={category}
          />
        );
      })}
    </>
  );
};

export default BlogCategoryList;
