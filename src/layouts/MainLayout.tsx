import { ExternalLinkIcon } from '@chakra-ui/icons';
import { Text, Image, Container, Box, HStack, VStack, StackDivider } from '@chakra-ui/react';
import { ReactElement } from 'react';
import BlogProfile from '~/components/BlogProfile';
import LinkText from '~/components/common/LinkText';
import RecommendedPostList from '~/components/RecommendedPostList';
import useLocale from '~/hooks/useLocale';
import useMobileMode from '~/hooks/useMobileMode';
import { blogMetadata } from '~/utils/meta';
import MainLayoutNavBar from './MainLayoutNavBar';

type Props = {
    children: ReactElement;
};

const MainLayout = (props: Props): JSX.Element => {
    const locale = useLocale();
    const isMobile = useMobileMode();

    if (isMobile) {
        return <MobileMainLayout {...props} />
    } else {
        return <DesktopMainLayout {...props} />
    }

};

const MobileMainLayout = (props: Props): JSX.Element => {
    const locale = useLocale();

    return <>
        <Box w="100%" h="100%" bg="gray.100">
            <Box bg="red.200">
                <MainLayoutNavBar links={locale.localization.navBarLinks} />
            </Box>

            <main>
                <HStack>
                    <Box h="full" w="100%" bg="white">
                        <Container maxW='6xl'>
                            {props.children}
                        </Container>
                    </Box>
                </HStack>
            </main>

        </Box>

        <MainLayoutFooter {...props} />
    </>;
};

const DesktopMainLayout = (props: Props): JSX.Element => {
    const locale = useLocale();

    return <>
        <Box w="100%" h="100%" bg="gray.100">
            <Box bg="red.200">
                <MainLayoutNavBar links={locale.localization.navBarLinks} />
            </Box>

            <main>
                <HStack m={4}>
                    <Box w="70%" bg="white">
                        <Container maxW='6xl'>
                            {props.children}
                        </Container>
                    </Box>
                    <Box w="30%" bg="white">
                        <VStack
                            divider={<StackDivider borderColor='gray.200' />}
                        >
                            <Box p={4} w="100%">
                                <BlogProfile />
                            </Box>
                            <Box p={4} w="100%">
                                <RecommendedPostList />
                            </Box>
                        </VStack>
                    </Box>
                </HStack>
            </main>

        </Box>

        <MainLayoutFooter {...props} />
    </>;
};

const MainLayoutFooter = (props: Props): JSX.Element => {
    const copyright = `© ${blogMetadata.year} Drumato`;
    return <Box bg="gray.100">
        <footer>
            <Text fontSize="xs">{copyright}</Text>
            <Text fontSize="xs">
                This work is licensed under a <LinkText href="https://creativecommons.org/licenses/by/4.0/deed.en">
                    Creative Commons Attribution 4.0 International License <ExternalLinkIcon mx='2px' />
                </LinkText>
                <Image src='cc-by-4-0.png' alt='Creative Commons 4.0' />
            </Text>
        </footer>
    </Box>;
};


export default MainLayout;