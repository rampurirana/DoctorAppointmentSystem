// Bulletproof Session Security Check (Handles back-button and page cache recovery)
window.addEventListener("pageshow", function (event) {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.replace("../index.html");
    }
});

const currentPage = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll(".navigation li a");

/**
 * Fetch and display Welcome Name in topbar across all dashboard pages
 */
async function loadWelcomeName() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const searchBar = document.querySelector(".search");
    if (!searchBar) return;

    // Check if welcome text already exists to prevent duplication
    if (document.getElementById("welcomeTextCard")) return;

    const cachedName = localStorage.getItem("userName") || "Valued Patient";

    const welcomeText = document.createElement("h3");
    welcomeText.id = "welcomeTextCard";
    welcomeText.style.color = "var(--primary-color-dark)";
    welcomeText.style.marginRight = "20px";
    welcomeText.style.fontSize = "1.1rem";
    welcomeText.style.fontWeight = "600";
    welcomeText.innerText = `Welcome, ${cachedName}!`;
    
    // Insert before search bar
    searchBar.parentElement.insertBefore(welcomeText, searchBar);

    // Only fetch if not in mock mode
    if (userId !== "mock_user") {
        try {
            const response = await fetch(`${(window.APP_BACKEND_URL || "https://doctor-backend-yrry.onrender.com")}/api/user/${userId}`);
            if (response.ok) {
                const user = await response.json();
                if (user.name && user.name !== cachedName) {
                    welcomeText.innerText = `Welcome, ${user.name}!`;
                    localStorage.setItem("userName", user.name); // Update local cache
                }
            }
        } catch (err) {
            console.error("Failed to fetch user name for welcome:", err);
        }
    }
}

/**
 * Update the notification badge in the sidebar for Users
 */
async function updateNotificationBadge() {
    const userId = localStorage.getItem("userId");
    if (!userId || userId === "mock_user") return;

    try {
        const response = await fetch(`${(window.APP_BACKEND_URL || "https://doctor-backend-yrry.onrender.com")}/api/user/${userId}/notifications/unread-count`);
        if (!response.ok) return;
        const { unreadCount } = await response.json();

        const navItem = document.querySelector(".navigation li a[href*='notification']");
        if (!navItem) return;

        let badge = navItem.querySelector(".nav-badge");
        if (unreadCount > 0) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "nav-badge";
                navItem.appendChild(badge);
            }
            badge.textContent = unreadCount;
        } else if (badge) {
            badge.remove();
        }
    } catch (err) {
        console.error("Failed to update notification badge:", err);
    }
}

// Dynamic Logout Listener
document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.querySelector(".navigation li a[href*='index.html']");
    if (logoutLink) {
        logoutLink.addEventListener("click", function(e) {
            e.preventDefault();
            localStorage.clear(); // Clear all user session data
            window.location.replace("../index.html"); // Redirect and replace history
        });
    }
});

/** 
 * Removed redundant Dashboard specific loading logic to prevent conflicts 
 * with page-specific scripts.
 */
function highlightActiveTab() {
    let matched = false;
    navLinks.forEach((link) => {
        const linkHref = link.getAttribute("href");
        if (linkHref && currentPage && currentPage.includes(linkHref)) {
            link.parentElement.classList.add("hovered");
            matched = true;
        } else {
            link.parentElement.classList.remove("hovered");
        }
    });

    // Default fallback to Dashboard if directory root or dashboard is opened
    if (!matched || !currentPage || currentPage === "" || currentPage === "User%20Dashboard" || currentPage === "User Dashboard") {
        const dashboardLi = document.querySelector(".navigation li a[href='dashboard.html']");
        if (dashboardLi) dashboardLi.parentElement.classList.add("hovered");
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    highlightActiveTab();
    loadWelcomeName();
    updateNotificationBadge();
});

// Handle Hover animations
let list = document.querySelectorAll(".navigation li");

function activelink(){
    // Prevent logo item from getting highlight class
    if (this.querySelector('.nav_logo') || this.parentElement.firstElementChild === this) return;
    list.forEach((item) => {
        item.classList.remove("hovered");
    });
    this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseenter", activelink));

// Reset highlighting to the actual active tab when mouse leaves sidebar
const navigationContainer = document.querySelector(".navigation");
if (navigationContainer) {
    navigationContainer.addEventListener("mouseleave", highlightActiveTab);
}

// Responsive Sidebar Toggle
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

if (toggle) {
    toggle.onclick = function () {
        navigation.classList.toggle("active");
        main.classList.toggle("active");
    }
}

// Dynamic Close Button for Mobile Sidebar (Inside Navigation)
if (navigation && !document.getElementById("nav-close-btn")) {
    const closeBtn = document.createElement("div");
    closeBtn.className = "nav-close-btn";
    closeBtn.id = "nav-close-btn";
    closeBtn.innerHTML = `<ion-icon name="close-outline"></ion-icon>`;
    navigation.appendChild(closeBtn);
    
    closeBtn.onclick = function () {
        navigation.classList.remove("active");
        if (main) main.classList.remove("active");
    };
}
