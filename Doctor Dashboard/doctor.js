// Security and Role Guard (Consistency with Admin/User Dashboards)
window.addEventListener("pageshow", function (event) {
    const userId = localStorage.getItem("userId");
    const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
    
    if (!userId || userRole !== "doctor") {
        document.documentElement.classList.add("app-loading");
        localStorage.clear();
        window.location.replace("../index.html");
    }
});

const currentPage = window.location.pathname.split("/").pop();
const navLinks = document.querySelectorAll(".navigation li a");
const backendUrl = window.APP_BACKEND_URL;
const doctorId = localStorage.getItem("userId");

/**
 * Universal Modal Handler for Doctor Actions
 */
let pendingModalAction = null;

function showDoctorModal(title, message, onConfirm = null) {
    const modal = document.getElementById("doctorActionModal");
    const titleEl = document.getElementById("modalTitle");
    const messageEl = document.getElementById("modalMessage");
    const confirmBtn = document.getElementById("modalConfirmBtn");
    const closeBtn = document.getElementById("modalCloseBtn");

    if (!modal) return;

    titleEl.innerText = title;
    messageEl.innerText = message;

    if (onConfirm) {
        confirmBtn.style.display = "block";
        closeBtn.innerText = "Cancel";
        pendingModalAction = onConfirm;
    } else {
        confirmBtn.style.display = "none";
        closeBtn.innerText = "Close";
        pendingModalAction = null;
    }

    modal.style.display = "flex";
}

/**
 * Fetch and display Welcome Name in topbar
 */
async function loadWelcomeName() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const searchBar = document.querySelector(".search");
    if (!searchBar) return;

    // Check if welcome text already exists to prevent duplication
    if (document.getElementById("welcomeTextCard")) return;

    const cachedName = localStorage.getItem("userName") || "Doctor";

    const welcomeText = document.createElement("h3");
    welcomeText.id = "welcomeTextCard";
    welcomeText.style.color = "var(--primary-color-dark)";
    welcomeText.style.marginRight = "20px";
    welcomeText.style.fontSize = "1.1rem";
    welcomeText.style.fontWeight = "600";

    welcomeText.innerText = `Welcome, ${cachedName}!`;
    
    // Insert before search bar
    searchBar.parentElement.insertBefore(welcomeText, searchBar);

    // Fetch fresh name from database asynchronously
    try {
        const response = await fetch(`${backendUrl}/api/doctor/profile/${userId}`);
        if (response.ok) {
            const user = await response.json();
            if (user.name && user.name !== cachedName) {
                welcomeText.innerText = `Welcome, ${user.name}!`;
                localStorage.setItem("userName", user.name); // Update local cache
            }
        }
    } catch (err) {
        console.error("Failed to fetch doctor name for welcome:", err);
    }
}

/**
 * Update the notification badge in the sidebar
 */
async function updateNotificationBadge() {
    const dId = localStorage.getItem("userId");
    if (!dId) return;

    try {
        const response = await fetch(`${backendUrl}/api/doctors/${encodeURIComponent(dId)}/notifications/unread-count`);
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

/**
 * Mark all notifications as read for the doctor
 */
async function markDoctorNotificationsAsRead() {
    const dId = localStorage.getItem("userId");
    if (!dId) return;

    try {
        const response = await fetch(`${backendUrl}/api/doctors/${encodeURIComponent(dId)}/notifications/read`, {
            method: "PATCH"
        });
        if (response.ok) {
            updateNotificationBadge();
        }
    } catch (err) {
        console.error("Failed to mark notifications as read:", err);
    }
}

/**
 * Clear all notifications for the doctor and update the badge
 */
async function clearAllDoctorNotifications() {
    const dId = localStorage.getItem("userId");
    if (!dId) return;

    showDoctorModal("Clear Notifications", "Are you sure you want to delete all notifications?", async () => {
        try {
            const response = await fetch(`${backendUrl}/api/doctors/${encodeURIComponent(dId)}/notifications`, {
                method: "DELETE"
            });

            if (response.ok) {
                // Refresh the sidebar badge immediately
                await updateNotificationBadge();
                // Refresh page content if function exists on notification.html
                if (typeof fetchNotifications === "function") {
                    fetchNotifications();
                }
                showDoctorModal("Success", "All notifications cleared successfully.");
            } else {
                const result = await response.json();
                throw new Error(result.error || "Failed to clear notifications");
            }
        } catch (err) {
            console.error("Error clearing notifications:", err);
            showDoctorModal("Error", err.message || "An unexpected error occurred.");
        }
    });
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

    // Default fallback to Dashboard
    if (!matched || !currentPage || currentPage === "" || currentPage === "Doctor%20Dashboard" || currentPage === "Doctor Dashboard") {
        const dashboardLi = document.querySelector(".navigation li a[href='doctor.html']");
        if (dashboardLi) dashboardLi.parentElement.classList.add("hovered");
    }
}

const toggle = document.querySelector(".toggle");
const navigation = document.querySelector(".navigation");
const main = document.querySelector(".main");

if (toggle && navigation && main) {
    toggle.onclick = function () {
        navigation.classList.toggle("active");
        main.classList.toggle("active");
    };
}

if (navigation && !document.getElementById("nav-close-btn")) {
    const closeBtn = document.createElement("div");
    closeBtn.className = "nav-close-btn";
    closeBtn.id = "nav-close-btn";
    closeBtn.innerHTML = `<ion-icon name="close-outline"></ion-icon>`;
    navigation.appendChild(closeBtn);

    closeBtn.addEventListener("click", () => {
        navigation.classList.remove("active");
        if (main) main.classList.remove("active");
    });
}

let activeTab = 'all';

function setupTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            activeTab = tab.dataset.tab;
            renderDoctorAppointments();
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    highlightActiveTab();
    loadWelcomeName();
    setupTabs();
    updateNotificationBadge();

    const searchInp = document.querySelector(".search input");
    const searchIcon = document.querySelector(".search ion-icon");
    let searchTimeout = null;
    
    if (searchInp) {
        // Real-time debounced global search
        searchInp.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performGlobalSearch, 300);
            // Keep local filtering active for immediate UI feedback on current table
            if (typeof renderDoctorAppointments === 'function') renderDoctorAppointments();
        });
        searchInp.addEventListener("keypress", (e) => { if (e.key === "Enter") performGlobalSearch(); });
    }

    if (searchIcon) {
        searchIcon.style.cursor = "pointer";
        searchIcon.onclick = performGlobalSearch;
    }

    // Handle auto-highlighting record from search redirection
    const urlParams = new URLSearchParams(window.location.search);
    const triggerId = urlParams.get('openAppt');
    if (triggerId && currentPage === "doctor.html") {
        setTimeout(() => {
            const found = doctorAppointments.find(a => a.id === triggerId);
            if (found && searchInp) {
                searchInp.value = found.appointment_id;
                renderDoctorAppointments();
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 800);
    }

    // Auto-mark notifications as read if on the notifications page
    if (currentPage && currentPage.toLowerCase().includes("notification.html")) {
        markDoctorNotificationsAsRead();
    }

    // Modal buttons setup
    document.getElementById("modalConfirmBtn")?.addEventListener("click", () => {
        if (pendingModalAction) {
            pendingModalAction();
            pendingModalAction = null;
        }
        document.getElementById("doctorActionModal").style.display = "none";
    });

    document.getElementById("modalCloseBtn")?.addEventListener("click", () => {
        document.getElementById("doctorActionModal").style.display = "none";
        pendingModalAction = null;
    });

    window.addEventListener("click", (event) => {
        const modal = document.getElementById("doctorActionModal");
        if (event.target === modal) {
            modal.style.display = "none";
            pendingModalAction = null;
        }
    });
});

// Handle Hover animations
let list = document.querySelectorAll(".navigation li");
function activelink(){
    if (this.querySelector('.nav_logo') || this.parentElement.firstElementChild === this) return;
    list.forEach((item) => {
        item.classList.remove("hovered");
    });
    this.classList.add("hovered");
}
list.forEach((item) => item.addEventListener("mouseenter", activelink));
const navigationContainer = document.querySelector(".navigation");
if (navigationContainer) {
    navigationContainer.addEventListener("mouseleave", highlightActiveTab);
}

let doctorAppointments = [];

async function loadDoctorAppointments() {
    const tbody = document.querySelector(".recentOrders table tbody");
    if (!tbody) return;

    if (!doctorId) {
        tbody.innerHTML = `<tr><td colspan="6">Please log in as a doctor.</td></tr>`;
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/doctor/appointments?doctorId=${encodeURIComponent(doctorId)}&t=${Date.now()}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load appointments");
        doctorAppointments = result;
        renderDoctorAppointments();
        renderDoctorStats();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">${err.message}</td></tr>`;
    }
}

function statusClass(status) {
    const value = (status || "").toLowerCase();
    if (value === "accepted" || value === "accept") return "accept";
    if (value === "rejected" || value === "reject") return "reject";
    if (value === "cancelled" || value === "cancel") return "cancel";
    if (value === "completed") return "completed";
    if (value === "not completed") return "incomplete";
    return "pending";
}

/**
 * Update red badges on the tab buttons (e.g., Requests count)
 */
function updateTabBadges() {
    const pendingTab = document.querySelector(".tab-btn[data-tab='pending']");
    if (!pendingTab) return;

    // Count only truly pending appointments (New requests)
    const requestCount = doctorAppointments.filter(app => 
        (app.status || "").toLowerCase().trim() === 'pending'
    ).length;

    let badge = pendingTab.querySelector(".tab-badge");
    if (requestCount > 0) {
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "tab-badge";
            pendingTab.appendChild(badge);
        }
        badge.textContent = requestCount;
    } else if (badge) {
        badge.remove();
    }
}

function renderDoctorStats() {
    const counts = doctorAppointments.reduce((result, appointment) => {
        const status = (appointment.status || "").toLowerCase().trim();
        if (status === "completed") {
            result.accepted++;
        } else if (status === "pending" || status === "accepted" || status === "accept") {
            result.pending++;
        } else if (status === "rejected" || status === "reject" || status === "cancelled" || status === "cancel" || status === "not completed" || status === "incomplete") {
            result.rejected++;
        }
        return result;
    }, { accepted: 0, pending: 0, rejected: 0 });

    updateTabBadges();

    const numbers = document.querySelectorAll(".cardBox .numbers");
    if (numbers.length >= 3) {
        numbers[0].textContent = counts.accepted;
        numbers[1].textContent = counts.pending;
        numbers[2].textContent = counts.rejected;
    }
}

function renderDoctorAppointments() {
    const tbody = document.querySelector(".recentOrders table tbody");
    if (!tbody) return;

    const search = (document.querySelector(".search input")?.value || "").toLowerCase().trim();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointments = doctorAppointments.filter((app) => {
        // Global Search Filter
        const matchesSearch = !search || 
            (app.patient_name || "").toLowerCase().includes(search) ||
            (String(app.appointment_id || "")).toLowerCase().includes(search) ||
            (app.appointment_date || "").includes(search) ||
            (app.status || "").toLowerCase().includes(search) ||
            (app.booking_slot || "").includes(search);
        
        if (!matchesSearch) return false;

        // Category Filtering Logic
        const appDate = new Date(app.appointment_date);
        appDate.setHours(0, 0, 0, 0);
        const status = (app.status || "").toLowerCase();

        if (activeTab === 'pending') return status === 'pending';
        if (activeTab === 'upcoming') return (status === 'accepted' || status === 'accept') && appDate >= today;
        // Show successfully finished (Completed) and failed-to-finish (Not Completed) in Past tab
        if (activeTab === 'past') {
            return ((status === 'accepted' || status === 'accept') && appDate < today) || status === 'completed' || status === 'not completed';
        }
        if (activeTab === 'cancelled') return status === 'cancelled' || status === 'cancel';
        if (activeTab === 'rejected') return status === 'rejected' || status === 'reject';
        
        return true;
    }).slice(0, 20);

    // Update Summary Box UI if present
    const summaryBox = document.getElementById("appointmentSummaryBox");
    if (summaryBox) {
        const dateTitle = summaryBox.querySelector("h3");
        const countBadge = document.getElementById("apptCountBadge");
        
        let displayTitle = "Appointments Overview";
        if (activeTab === 'pending') displayTitle = "New Patient Requests";
        else if (activeTab === 'upcoming') displayTitle = "Your Upcoming Schedule";
        else if (activeTab === 'past') displayTitle = "Completed & Past Visits";
        else if (activeTab === 'cancelled') displayTitle = "Cancelled Appointments";
        
        if (dateTitle) dateTitle.textContent = displayTitle;
        if (countBadge) countBadge.textContent = `${appointments.length} Total`;
    }

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px;">No ${activeTab} appointments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    appointments.forEach((appointment) => {
        const status = (appointment.status || "").toLowerCase();
        const pending = status === "pending";
        const accepted = status === "accepted" || status === "accept";
        const isCompleted = status === "completed";
        const isNotCompleted = status === "not completed";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${appointment.patient_name || "N/A"}</td>
            <td>${new Date(appointment.appointment_date).toLocaleDateString()}</td>
            <td><div class="table-date" style="font-size: 0.85rem;">${appointment.appointment_id || "N/A"}</div></td>
            <td>${appointment.booking_slot || "Not assigned"}</td>
            <td><span class="status ${statusClass(appointment.status)}">${appointment.status}</span></td>
            <td>
                ${pending ? `
                    <input class="serial-input" type="text" maxlength="3" inputmode="numeric" placeholder="01" aria-label="Serial number">
                    <button class="appointment-action accept">Accept</button>
                    <button class="appointment-action reject">Reject</button>
                ` : (accepted ? `
                    <button class="appointment-action complete">Completed</button>
                    <button class="appointment-action incomplete">Not Completed</button>
                    <button class="appointment-action pending">Pending</button>
                ` : (isCompleted ? `
                    <button class="appointment-action complete" disabled>Completed</button>
                ` : (isNotCompleted ? `
                    <button class="appointment-action incomplete" disabled>Not Completed</button>
                ` : "-")))}
            </td>
        `;

        if (pending) {
            tr.querySelector(".appointment-action.accept").onclick = () => acceptAppointment(appointment.id, tr);
            tr.querySelector(".appointment-action.reject").onclick = () => rejectAppointment(appointment.id);
        } else if (accepted) {
            tr.querySelector(".appointment-action.complete").onclick = () => completeAppointment(appointment.id);
            tr.querySelector(".appointment-action.incomplete").onclick = () => incompleteAppointment(appointment.id);
            tr.querySelector(".appointment-action.pending").onclick = () => revertAppointmentToPending(appointment.id);
        }
        tbody.appendChild(tr);
    });
}

async function acceptAppointment(id, row) {
    const bookingSlot = row.querySelector(".serial-input").value.trim();
    if (!/^\d{1,3}$/.test(bookingSlot)) {
        showDoctorModal("Invalid Input", "Please enter a numeric serial number (e.g., 01, 15).");
        return;
    }

    showDoctorModal("Accept Appointment", `Accept this appointment with serial number ${bookingSlot}?`, async () => {
        await updateAppointment(`/api/appointments/${id}/accept`, { doctorId, bookingSlot });
    });
}

async function completeAppointment(id) {
    showDoctorModal("Mark Completed", "Are you sure you want to mark this appointment as completed?", async () => {
        await updateAppointment(`/api/appointments/${id}/complete`, {});
    });
}

async function incompleteAppointment(id) {
    showDoctorModal("Mark Incomplete", "Mark this appointment as 'Not Completed'?", async () => {
        await updateAppointment(`/api/appointments/${id}/incomplete`, {});
    });
}

async function revertAppointmentToPending(id) {
    showDoctorModal("Revert to Pending", "Are you sure you want to move this appointment back to patient requests?", async () => {
        await updateAppointment(`/api/appointments/${id}/pending`, {});
    });
}

async function rejectAppointment(id) {
    showDoctorModal("Reject Request", "Are you sure you want to decline this appointment request?", async () => {
        await updateAppointment(`/api/appointments/${id}/reject`, { doctorId });
    });
}

async function updateAppointment(path, body) {
    try {
        const response = await fetch(`${backendUrl}${path}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        // Check if the response is actually JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("Non-JSON response received:", text);
            throw new Error(`Server error: Received HTML instead of JSON. Ensure your backend is running on port 10000.`);
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Update failed");
        showDoctorModal("Success", result.message);
        loadDoctorAppointments();
    } catch (err) {
        console.error("Appointment Update Error:", err);
        showDoctorModal("Error", err.message || "An unexpected error occurred.");
    }
}

/**
 * Global Search Implementation - Real-time Dropdown
 */
window.handleGlobalSearchClick = function(type, id) {
    const dropdown = document.getElementById("searchDropdown");
    if (dropdown) dropdown.classList.remove("active");

    if (type === 'appointment') {
        // Redirection logic to main doctor dashboard with a trigger parameter
        window.location.href = `doctor.html?openAppt=${id}`;
    } else {
        // For non-appointment records, doctors usually don't have separate profile pages.
        showDoctorModal("Information", `Record found (${type}). Specialized view for this category is restricted to administrative staff.`);
    }
};

async function performGlobalSearch() {
    const searchInput = document.querySelector(".search input");
    const dropdown = document.getElementById("searchDropdown");
    if (!searchInput || !dropdown) return;
    
    const query = searchInput.value.trim();
    if (!query) {
        dropdown.classList.remove("active");
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/admin/global-lookup?query=${encodeURIComponent(query)}`);
        const result = await response.json();

        if (!response.ok) {
            dropdown.innerHTML = `<div class="search-no-results">${result.error || "No match found."}</div>`;
            dropdown.classList.add("active");
            return;
        }

        showGlobalSearchResult(result.type, result.data);
    } catch (err) {
        console.error("Global search error:", err);
        dropdown.innerHTML = `<div class="search-no-results">Error connecting to search service.</div>`;
        dropdown.classList.add("active");
    }
}

function showGlobalSearchResult(type, data) {
    const dropdown = document.getElementById("searchDropdown");
    if (!dropdown) return;
    
    const title = type === 'appointment' ? data.appointment_id : (data.user_id || data.doc_id || 'Account');
    const subtitle = type === 'appointment' 
        ? `Patient: ${data.patient_name}`
        : `Name: ${data.name} | ${data.email}`;

    dropdown.innerHTML = `
        <div class="search-result-item" onclick="window.handleGlobalSearchClick('${type}', '${data.id}')">
            <h4>${title}</h4>
            <p>${subtitle}</p>
            <span class="type-badge">${type}</span>
        </div>`;
    dropdown.classList.add("active");
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener("click", (e) => {
    const searchContainer = document.querySelector(".search");
    const dropdown = document.getElementById("searchDropdown");
    if (dropdown && searchContainer && !searchContainer.contains(e.target)) {
        dropdown.classList.remove("active");
    }
});

// Logout handling
document.addEventListener("DOMContentLoaded", () => {
    const logoutLink = document.querySelector(".navigation li a[href*='index.html']");
    if (logoutLink) {
        logoutLink.addEventListener("click", function(e) {
            e.preventDefault();
            document.documentElement.classList.add("app-loading");
            localStorage.clear();
            window.location.replace("../index.html");
        });
    }
});

if (currentPage === "doctor.html") {
    loadDoctorAppointments();
}
