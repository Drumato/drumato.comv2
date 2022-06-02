import { FC, ReactElement } from "react";

type Props = {
  children: ReactElement;
};

const PostLayout: FC<Props> = ({ children }: Props) => {
  return <>{children}</>;
};

export default PostLayout;
