// Bulletproof Session Security Check (Handles back-button and page cache recovery)
window.addEventListener("pageshow", function (event) {
    const userId = localStorage.getItem("userId");
    if (!userId) {
        window.location.replace("../index.html");
    }
});

const currentPage = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll(".navigation li a");

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
        if (dashboardLi) {
            dashboardLi.parentElement.classList.add("hovered");
        }
    }
}

// Initialize on page load
highlightActiveTab();

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