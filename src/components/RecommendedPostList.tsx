import useLocale from "~/hooks/useLocale";
import { SupportedLocaleJapanese } from "~/utils/locale/supported";
import { Text } from "@chakra-ui/react";

const RecommendedPostList = (): JSX.Element => {
    const locale = useLocale();

    if (locale.rawLocale === SupportedLocaleJapanese) {
        return <JapaneseRecommendedPostList />;
    } else {
        return <EnglishRecommendedPostList />;
    }
};

const JapaneseRecommendedPostList = (): JSX.Element => {
    return <>
        <Text size="xs">おすすめ記事</Text>
    </>;
};

const EnglishRecommendedPostList = (): JSX.Element => {
    return <>
        <Text size="xs">Recommended Posts</Text>
    </>;
};

export default RecommendedPostList;