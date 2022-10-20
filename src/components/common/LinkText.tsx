import { Link } from "@chakra-ui/react";
import { ReactNode } from "react";

type Props = {
    href: string;
    children: ReactNode;
};

const LinkText = (props: Props): JSX.Element => {
    return <Link href={props.href} isExternal>{props.children}</Link>;
};

export default LinkText;