// Cookie Consent System - UniRecorder
(function() {
    function getConsent() {
        try { const ls = localStorage.getItem('cookieConsent'); if (ls) return ls; } catch (e) {}
        const match = document.cookie.match(/(?:^|;\s*)cookieConsent=([^;]+)/);
        if (match) return decodeURIComponent(match[1]);
        return null;
    }

    function setConsent(value) {
        try { localStorage.setItem('cookieConsent', value); } catch (e) {}
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = 'cookieConsent=' + encodeURIComponent(value) + '; expires=' + expires.toUTCString() + '; path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    }

    function createBanner() {
        if (document.getElementById('cookieBanner')) return;
        const html = `
            <div id="cookieBanner" class="cookie-banner">
                <div class="cookie-inner">
                    <div class="cookie-text">
                        🍪 We use cookies to improve your experience and show relevant ads.
                        <a href="cookie-policy.html">Learn more</a>
                    </div>
                    <div class="cookie-btns">
                        <button class="cookie-btn accept" onclick="acceptCookies()">Accept All</button>
                        <button class="cookie-btn decline" onclick="declineCookies()">Decline</button>
                    </div>
                </div>
            </div>
            <style>
            .cookie-banner { display: none; position: fixed; bottom: 0; left: 0; right: 0; background: linear-gradient(135deg, #131829, #0f1421); border-top: 1px solid rgba(79,140,255,0.3); padding: 16px 20px; z-index: 99999; box-shadow: 0 -8px 30px rgba(0,0,0,0.5); }
            .cookie-banner.show { display: block; }
            .cookie-inner { max-width: 1100px; margin: 0 auto; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }
            .cookie-text { color: #e2e8f0; font-size: 13.5px; line-height: 1.5; flex: 1; min-width: 240px; }
            .cookie-text a { color: #4f8cff; text-decoration: underline; }
            .cookie-btns { display: flex; gap: 10px; flex-wrap: wrap; }
            .cookie-btn { border: none; border-radius: 10px; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
            .cookie-btn.accept { background: linear-gradient(135deg, #4f8cff, #3d6fd9); color: #fff; }
            .cookie-btn.accept:hover { box-shadow: 0 6px 20px rgba(79,140,255,0.4); }
            .cookie-btn.decline { background: rgba(255,255,255,0.06); color: #b8bcc8; border: 1px solid rgba(255,255,255,0.15); }
            .cookie-btn.decline:hover { background: rgba(255,255,255,0.12); }
            @media (max-width: 600px) { .cookie-inner { flex-direction: column; align-items: stretch; } .cookie-btns { justify-content: stretch; } .cookie-btn { flex: 1; } }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createBanner);
    } else {
        createBanner();
    }

    const consent = getConsent();
    if (!consent) {
        setTimeout(() => {
            const b = document.getElementById('cookieBanner');
            if (b) b.classList.add('show');
        }, 800);
    }

    window.acceptCookies = function() {
        setConsent('accepted');
        const b = document.getElementById('cookieBanner');
        if (b) b.classList.remove('show');
        if (window.gtag) gtag('consent', 'update', { 'ad_storage': 'granted', 'analytics_storage': 'granted' });
    };

    window.declineCookies = function() {
        setConsent('declined');
        const b = document.getElementById('cookieBanner');
        if (b) b.classList.remove('show');
        if (window.gtag) gtag('consent', 'update', { 'ad_storage': 'denied', 'analytics_storage': 'denied' });
    };
})();
