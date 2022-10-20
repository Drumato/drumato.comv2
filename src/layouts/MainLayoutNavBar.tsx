import { CloseIcon, HamburgerIcon } from "@chakra-ui/icons";
import { useDisclosure, Flex, IconButton, HStack, Menu, MenuButton, Button, Avatar, MenuList, MenuItem, MenuDivider, Stack, Link, Box, Heading, Spacer } from "@chakra-ui/react";
import { ReactNode } from "react";
import useLocale from "~/hooks/useLocale";
import useMobileMode from "~/hooks/useMobileMode";
import { NavBarLinks } from "~/utils/locale/localization";
import { SupportedLocaleJapanese } from "~/utils/locale/supported";

type MainLayoutNavBarProps = {
    links: NavBarLinks;
};

type NavLinkProps = {
    href: string;
    children: ReactNode;
};

const NavLink = (props: NavLinkProps) => (
    <Link
        px={2}
        py={1}
        rounded={'md'}
        color="white"
        href={props.href}>
        {props.children}
    </Link>
);

const MainLayoutNavBar = (props: MainLayoutNavBarProps) => {
    const isMobile = useMobileMode();

    if (isMobile) {
        return <MobileNavBar {...props} />;
    } else {
        return <DesktopNavBar {...props} />;
    }
};

const DesktopNavBar = (props: MainLayoutNavBarProps) => {
    const locale = useLocale();
    const localizedHref = (href: string) => (`/${locale.rawLocale}/${href}`);

    const navBarItems = [
        // post
        {
            href: props.links.post.href,
            name: locale.rawLocale === SupportedLocaleJapanese ? "記事一覧" : "post",
        },
        // diary
        {
            href: props.links.diary.href,
            name: locale.rawLocale === SupportedLocaleJapanese ? "日記一覧" : "diary",
        },
    ];

    return (
        <>
            <Box px={4}>
                <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                    <HStack spacing={8} alignItems={'center'}>
                        <NavLink href={`/${locale.rawLocale}`} >drumato.com</NavLink>
                        <HStack
                            as={'nav'}
                            spacing={4}
                            display='flex'>

                            {navBarItems.map((item) => {
                                return <NavLink
                                    key={item.name}
                                    href={localizedHref(item.href)}>
                                    {item.name}
                                </NavLink>;
                            })}
                        </HStack>
                    </HStack>
                </Flex>
            </Box>
        </>
    );
};



const MobileNavBar = (props: MainLayoutNavBarProps) => {
    const locale = useLocale();
    const localizedHref = (href: string) => (`/${locale.rawLocale}/${href}`);
    const { isOpen, onOpen, onClose } = useDisclosure();

    const navBarItems = [
        // post
        {
            href: props.links.post.href,
            name: locale.rawLocale === SupportedLocaleJapanese ? "記事一覧" : "post",
        },
        // diary
        {
            href: props.links.diary.href,
            name: locale.rawLocale === SupportedLocaleJapanese ? "日記一覧" : "diary",
        },
    ];

    const NavBarItems = () => <>
        {
            navBarItems.map((item) => {
                return <NavLink
                    key={item.name}
                    href={localizedHref(item.href)}>
                    {item.name}
                </NavLink>;
            })
        }
    </>;

    return (
        <>
            <Box px={4}>
                <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
                    <HStack spacing={8} alignItems={'center'}>
                        <NavLink href={`/${locale.rawLocale}`} >drumato.com</NavLink>
                    </HStack>
                    <Spacer />
                    <IconButton
                        size={'md'}
                        icon={isOpen ? <CloseIcon /> : <HamburgerIcon />}
                        aria-label={'Open Menu'}
                        onClick={isOpen ? onClose : onOpen}
                    />
                </Flex>

                {isOpen ? (
                    <Box pb={4} >
                        <Stack as={'nav'} spacing={4}>
                            <NavBarItems />
                        </Stack>
                    </Box>
                ) : null}
            </Box>
        </>
    );
};

export default MainLayoutNavBar;