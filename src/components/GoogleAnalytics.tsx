import Script from "next/script";

const GoogleAnalytics = (): JSX.Element => {
  const googleAnalyticsID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID ?? "";

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${googleAnalyticsID}');
          `}
      </Script>
    </>
  );
};
export default GoogleAnalytics;
