(function () {
    window.APP_BACKEND_URL = "https://doctor-backend-yrry.onrender.com";

    let initialPageLoad = true;
    let requestCount = 0;

    function setLoading(isLoading) {
        document.documentElement.classList.toggle("app-loading", isLoading);
    }

    function updateLoading() {
        setLoading(initialPageLoad || requestCount > 0);
    }

    setLoading(true);

    if (window.fetch) {
        const nativeFetch = window.fetch.bind(window);
        window.fetch = function () {
            requestCount += 1;
            updateLoading();

            return nativeFetch.apply(null, arguments).finally(function () {
                requestCount = Math.max(0, requestCount - 1);
                updateLoading();
            });
        };
    }

    document.addEventListener("DOMContentLoaded", function () {
        const status = document.createElement("div");
        status.className = "app-loader-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        status.textContent = "Loading...";
        document.body.appendChild(status);

        document.addEventListener("click", function (event) {
            const link = event.target.closest("a[href]");
            if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            if (link.target === "_blank" || link.hasAttribute("download")) return;

            const destination = link.getAttribute("href");
            if (!destination || destination === "#" || destination.startsWith("#") || destination.startsWith("javascript:")) return;

            setLoading(true);
        });
    });

    window.addEventListener("load", function () {
        initialPageLoad = false;
        updateLoading();
    });
})();
