// Navigation behavior
const list = document.querySelectorAll(".navigation li");
const toggle = document.querySelector(".toggle");
const navigation = document.querySelector(".navigation");
const main = document.querySelector(".main");

function activateLink() {
    list.forEach((item) => item.classList.remove("hovered"));
    this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseover", activateLink));

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

const backendUrl = "http://localhost:10000";
const doctorName = localStorage.getItem("userName");
const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
let doctorAppointments = [];

if (userRole && userRole !== "doctor") {
    window.location.replace("../index.html");
}

async function loadDoctorAppointments() {
    const tbody = document.querySelector(".recentOrders table tbody");
    if (!doctorName) {
        tbody.innerHTML = `<tr><td colspan="5">Please log in as a doctor.</td></tr>`;
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/api/doctor/appointments?doctorName=${encodeURIComponent(doctorName)}&t=${Date.now()}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not load appointments");
        doctorAppointments = result;
        renderDoctorAppointments();
        renderDoctorStats();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">${err.message}</td></tr>`;
    }
}

function statusClass(status) {
    const value = (status || "").toLowerCase();
    if (value === "accepted" || value === "accept") return "accept";
    if (value === "rejected" || value === "reject") return "reject";
    if (value === "cancelled" || value === "cancel") return "cancel";
    return "pending";
}

function renderDoctorStats() {
    const counts = doctorAppointments.reduce((result, appointment) => {
        const status = (appointment.status || "").toLowerCase();
        if (status === "accepted" || status === "accept") result.accepted++;
        else if (status === "pending") result.pending++;
        else result.rejected++;
        return result;
    }, { accepted: 0, pending: 0, rejected: 0 });

    const numbers = document.querySelectorAll(".cardBox .numbers");
    if (numbers.length >= 3) {
        numbers[0].textContent = counts.accepted;
        numbers[1].textContent = counts.pending;
        numbers[2].textContent = counts.rejected;
    }
}

function renderDoctorAppointments() {
    const tbody = document.querySelector(".recentOrders table tbody");
    const search = (document.querySelector(".search input")?.value || "").toLowerCase().trim();
    const appointments = doctorAppointments.filter((appointment) => {
        if (!search) return true;
        return (appointment.patient_name || "").toLowerCase().includes(search) ||
            (appointment.appointment_date || "").includes(search) ||
            (appointment.status || "").toLowerCase().includes(search) ||
            (appointment.booking_slot || "").includes(search);
    });

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No appointments found.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";
    appointments.forEach((appointment) => {
        const pending = (appointment.status || "").toLowerCase() === "pending";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${appointment.patient_name || "N/A"}</td>
            <td>${new Date(appointment.appointment_date).toLocaleDateString()}</td>
            <td>${appointment.booking_slot || "Not assigned"}</td>
            <td><span class="status ${statusClass(appointment.status)}">${appointment.status}</span></td>
            <td>
                ${pending ? `
                    <input class="serial-input" type="text" maxlength="3" inputmode="numeric" placeholder="01" aria-label="Serial number">
                    <button class="appointment-action accept">Accept</button>
                    <button class="appointment-action reject">Reject</button>
                ` : "-"}
            </td>
        `;

        if (pending) {
            tr.querySelector(".appointment-action.accept").onclick = () => acceptAppointment(appointment.id, tr);
            tr.querySelector(".appointment-action.reject").onclick = () => rejectAppointment(appointment.id);
        }
        tbody.appendChild(tr);
    });
}

async function acceptAppointment(id, row) {
    const bookingSlot = row.querySelector(".serial-input").value.trim();
    if (!/^\d{1,3}$/.test(bookingSlot)) {
        alert("Enter a numeric serial number, for example 01.");
        return;
    }

    await updateAppointment(`/api/appointments/${id}/accept`, { doctorName, bookingSlot });
}

async function rejectAppointment(id) {
    if (!confirm("Reject this appointment request?")) return;
    await updateAppointment(`/api/appointments/${id}/reject`, { doctorName });
}

async function updateAppointment(path, body) {
    try {
        const response = await fetch(`${backendUrl}${path}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Update failed");
        alert(result.message);
        loadDoctorAppointments();
    } catch (err) {
        alert(err.message);
    }
}

document.querySelector(".search input")?.addEventListener("input", renderDoctorAppointments);
loadDoctorAppointments();
