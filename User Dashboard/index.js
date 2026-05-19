// Get current page filename to automatically highlight active tab
const currentPage = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll(".navigation li a");

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