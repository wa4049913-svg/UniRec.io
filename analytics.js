// Auto-inject Google Analytics on every page
(function() {
    // Skip if already loaded
    if (window.__analyticsLoaded) return;
    window.__analyticsLoaded = true;

    // 1. Load gtag script
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-86S6HNZXBE';
    document.head.appendChild(gaScript);

    // 2. Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-86S6HNZXBE');
    window.gtag = gtag;
})();
