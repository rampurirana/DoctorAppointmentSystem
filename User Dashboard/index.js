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

/**
 * Fetch and display Dashboard Stats
 */
async function loadDashboardStats() {
    const userId = localStorage.getItem("userId");
    if (!userId || userId === "mock_user") return;

    try {
        const response = await fetch(`http://localhost:10000/api/user/${userId}/stats`);
        if (!response.ok) throw new Error("Failed to fetch stats");

        const stats = await response.json();

        // Mapping stats to UI elements (assuming these IDs exist in dashboard.html)
        const successEl = document.getElementById("success-count");
        const pendingEl = document.getElementById("pending-count");
        const rejectEl = document.getElementById("reject-count");

        if (successEl) successEl.textContent = stats.success;
        if (pendingEl) pendingEl.textContent = stats.pending;
        if (rejectEl) rejectEl.textContent = stats.reject;
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

/**
 * Fetch and display Recent Appointments
 */
async function loadRecentAppointments() {
    const userId = localStorage.getItem("userId");
    if (!userId || userId === "mock_user") return;

    try {
        const response = await fetch(`http://localhost:10000/api/user/${userId}/appointments`);
        if (!response.ok) throw new Error("Failed to fetch appointments");

        const appointments = await response.json();
        const tableBody = document.querySelector(".recentOrders table tbody");

        if (tableBody) {
            tableBody.innerHTML = appointments.slice(0, 5).map(app => `
                <tr>
                    <td>${app.patient_name}</td>
                    <td>${app.doctor_name}</td>
                    <td>${app.booking_slot || "Pending assignment"}</td>
                    <td><span class="status ${app.status.toLowerCase()}">${app.status}</span></td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error("Error loading appointments:", err);
    }
}

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
            // Auto-load data if on dashboard
            loadDashboardStats();
            loadRecentAppointments();
        }
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", highlightActiveTab);

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
