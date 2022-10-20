import { HStack, Image, Link, Text } from '@chakra-ui/react';
import useLocale from '~/hooks/useLocale';
import { SupportedLocaleEnglish, SupportedLocaleJapanese } from '~/utils/locale/supported';
import { AiFillGithub, AiFillLinkedin, AiFillTwitterCircle } from 'react-icons/ai';
import { FaFacebook } from 'react-icons/fa';
import { blogMetadata } from '~/utils/meta';

const BlogProfile = (): JSX.Element => {
    const locale = useLocale();

    return <>
        <Image src='drumato.png' alt='drumato' />
        {locale.rawLocale === SupportedLocaleEnglish && <EnglishBlogProfile />}
        {locale.rawLocale === SupportedLocaleJapanese && <JapaneseBlogProfile />}

        <HStack >
            <Link href={blogMetadata.githubURL}>
                <AiFillGithub size="2em" />
            </Link>
            <Link href={blogMetadata.linkedInURL}>
                <AiFillLinkedin color="#4169e1" size="2em" />
            </Link>
            <Link href={blogMetadata.twitterURL}>
                <AiFillTwitterCircle color="#87ceeb" size="2em" />
            </Link>
            <Link href={blogMetadata.faceBookURL}>
                <FaFacebook color="#4169e1" size="2em" />
            </Link>
        </HStack>
    </>;
};

const EnglishBlogProfile = (): JSX.Element => {
    return <>
        <Text size="xs">A software engineer loves Peaches🍑</Text>
    </>;
};

const JapaneseBlogProfile = (): JSX.Element => {
    return <>
        <Text size="xs">桃🍑が好きなソフトウェアエンジニア</Text>
    </>;
};

export default BlogProfile;