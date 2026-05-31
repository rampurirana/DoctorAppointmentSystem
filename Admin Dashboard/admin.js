// Security and Role Guard (Consistency with Doctor/User Dashboards)
window.addEventListener("pageshow", function (event) {
    const userId = localStorage.getItem("userId");
    const userRole = (localStorage.getItem("userRole") || "").toLowerCase();
    
    if (!userId || userRole !== "admin") {
        localStorage.clear();
        window.location.replace("../index.html");
    }
});

const currentPage = window.location.pathname.split("/").pop()?.toLowerCase();
const navLinks = document.querySelectorAll(".navigation li a");
const backendUrl = "http://localhost:10000";
let appointmentsLineChart = null;
let statusDoughnutChart = null;
const apptDateFilter = document.getElementById("adminApptDate");
let allDoctorsForEdit = [];
let pendingModalAction = null;

const stateDistrictMap = {
    "Andhra Pradesh": ["Anantapur", "Chittoor", "East Godavari", "Guntur", "Krishna", "Kurnool", "Nellore", "Prakasam", "Srikakulam", "Visakhapatnam", "Vizianagaram", "West Godavari", "YSR Kadapa"],
            "Arunachal Pradesh": ["Anjaw", "Changlang", "Dibang Valley", "East Kameng", "East Siang", "Kra Daadi", "Kurung Kumey", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke-Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
            "Assam": ["Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup Metropolitan", "Kamrup", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara-Mankachar", "Tinsukia", "Udalguri", "West Karbi Anglong"],
            "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
            "Chhattisgarh": ["Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurela-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Kondagaon", "Korba", "Koriya", "Mahasamund", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sukma", "Surajpur", "Surguja"],
            "Goa": ["North Goa", "South Goa"],
            "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhoomi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
            "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
            "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
            "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribagh", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahebganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
            "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru Rural", "Bengaluru Urban", "Bidar", "Chamarajanagar", "Chikkaballapur", "Chikkamagaluru", "Chitradurga", "Dakshina Kannada", "Davangere", "Dharwad", "Gadag", "Hassan", "Haveri", "Kalaburagi", "Kodagu", "Kolar", "Koppal", "Mandya", "Mysuru", "Raichur", "Ramanagara", "Shivamogga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayapura", "Yadgir"],
            "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
            "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Hoshangabad", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa", "Khargone", "Mandla", "Mandsaur", "Morena", "Narsinghpur", "Neemuch", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
            "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
            "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
            "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
            "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip", "Saitual"],
            "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Peren", "Phek", "Tuensang", "Wokha", "Zunheboto", "Noklak"],
            "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh", "Bhadrak", "Boudh", "Cuttack", "Debagarh", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur", "Sundargarh"],
            "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Ferozepur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Mansa", "Moga", "Muktsar", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shaheed Bhagat Singh Nagar", "Tarn Taran"],
            "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
            "Sikkim": ["East Sikkim", "North Sikkim", "South Sikkim", "West Sikkim"],
            "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kancheepuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
            "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Komaram Bheem", "Mahabubabad", "Mahabubnagar", "Mancherial", "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal Rural", "Warangal Urban", "Yadadri Bhuvanagiri"],
            "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
            "Uttar Pradesh": ["Agra", "Aligarh", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Ayodhya", "Azamgarh", "Baghpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kheri", "Kushinagar", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shrawasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
            "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Haridwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi"],
            "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Malda", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
            "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
            "Chandigarh": ["Chandigarh"],
            "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
            "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
            "Jammu and Kashmir": ["Anantnag", "Bandipora", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
            "Ladakh": ["Kargil", "Leh"],
            "Lakshadweep": ["Lakshadweep"],
            "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"]
};

function populateDistrictOptions(stateValue, selectedDistrict = "") {
    const districtSelect = document.getElementById("editUserDistrict");
    const manualInput = document.getElementById("editUserDistrictManual");
    if (!districtSelect) return;

    const districts = stateDistrictMap[stateValue] || [];
    districtSelect.innerHTML = "<option value=''>Select district</option>";

    let foundSelected = false;
    districts.forEach(district => {
        const isSelected = district === selectedDistrict ? 'selected' : '';
        if (district === selectedDistrict) foundSelected = true;
        districtSelect.innerHTML += `<option value="${district}" ${isSelected}>${district}</option>`;
    });

    if (selectedDistrict && !foundSelected && selectedDistrict !== "") {
        districtSelect.innerHTML += `<option value="${selectedDistrict}" selected>${selectedDistrict}</option>`;
        foundSelected = true;
    }

    districtSelect.innerHTML += `<option value="__other__" ${selectedDistrict === '__other__' ? 'selected' : ''}>Other / Not listed</option>`;

    if (manualInput) {
        if (selectedDistrict && !foundSelected) {
            manualInput.value = selectedDistrict;
            manualInput.style.display = "block";
            districtSelect.value = "__other__";
        } else if (districtSelect.value === "__other__") {
            manualInput.style.display = "block";
        } else {
            manualInput.style.display = "none";
            manualInput.value = "";
        }
    }
}

function ensureSelectValue(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return;
    if (value && !Array.from(select.options).some(opt => opt.value === value)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = true;
        select.appendChild(option);
    } else {
        select.value = value || "";
    }
}

/**
 * Universal Modal Handler for Admin Actions
 */
function showAdminModal(title, message, type = 'success', onConfirm = null) {
    const modal = document.getElementById("adminActionModal");
    const titleEl = document.getElementById("modalTitle");
    const messageEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIcon");
    const confirmBtn = document.getElementById("modalConfirmBtn");
    const closeBtn = document.getElementById("modalCloseBtn");

    if (!modal) return;
    titleEl.innerText = title;
    messageEl.innerText = message;

    if (type === 'success') { iconEl.name = "checkmark-circle-outline"; iconEl.style.color = "var(--primary-color)"; }
    else if (type === 'error') { iconEl.name = "alert-circle-outline"; iconEl.style.color = "var(--danger)"; }
    else if (type === 'warning') { iconEl.name = "help-circle-outline"; iconEl.style.color = "var(--warning)"; }

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
 * Display Admin name in topbar
 */
function loadWelcomeName() {
    const userName = localStorage.getItem("userName") || "Admin";
    const topBar = document.querySelector(".topbar");
    const searchBar = document.querySelector(".search");
    const userDiv = document.querySelector(".user");
    if (!topBar || document.getElementById("welcomeTextCard")) return;

    const welcomeText = document.createElement("h3");
    welcomeText.id = "welcomeTextCard";
    welcomeText.style.color = "var(--primary-color-dark)";
    welcomeText.style.marginRight = "20px";
    welcomeText.style.fontSize = "1.1rem";
    welcomeText.style.fontWeight = "600";
    welcomeText.innerText = `Welcome, ${userName}!`;
    
    // Insert before search bar if available, otherwise before the user profile icon
    const anchor = searchBar || userDiv;
    if (anchor) {
        anchor.parentElement.insertBefore(welcomeText, anchor);
    } else {
        topBar.appendChild(welcomeText);
    }

    // Refresh admin name from the specific admin profile endpoint
    const userId = localStorage.getItem("userId");
    if (userId) {
        fetch(`${backendUrl}/api/admin/profile/${userId}`)
            .then(res => res.json())
            .then(data => {
                if (data.name) {
                    welcomeText.innerText = `Welcome, ${data.name}!`;
                    localStorage.setItem("userName", data.name);
                }
            }).catch(err => console.error("Admin name refresh failed:", err));
    }
}

function setGrowthDisplay(element, growth, placeholderText) {
    if (!element) return;
    if (!growth || typeof growth.change !== 'number') {
        element.innerHTML = `<ion-icon name="trending-up-outline"></ion-icon> ${placeholderText}`;
        element.classList.remove('positive', 'negative');
        return;
    }

    const percent = Math.round(growth.percent);
    const sign = percent > 0 ? '+' : '';
    element.innerHTML = `<ion-icon name="trending-up-outline"></ion-icon> ${sign}${percent}% ${placeholderText}`;
    element.classList.toggle('positive', percent >= 0);
    element.classList.toggle('negative', percent < 0);
}

/**
 * Fetch real-time dashboard stats from API
 */
async function updateDashboardStats(filterType = 'recent', date = null) {
    try {
        let url = `${backendUrl}/api/admin/dashboard-stats`;
        const params = new URLSearchParams();

        if (filterType === 'all') {
            params.append('filterType', 'all');
        } else if (date) {
            params.append('filterType', 'date');
            params.append('date', date);
        } // else default to 'recent' (no params needed for default)
        if (params.toString()) url += `?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const stats = await response.json();
        
        if (document.getElementById("totalAppointments")) document.getElementById("totalAppointments").textContent = stats.appointments;
        if (document.getElementById("totalDoctors")) document.getElementById("totalDoctors").textContent = stats.doctors;
        if (document.getElementById("totalCustomers")) document.getElementById("totalCustomers").textContent = stats.customers;
        if (document.getElementById("totalAdmins")) document.getElementById("totalAdmins").textContent = stats.admins;

        setGrowthDisplay(document.getElementById('appointmentsGrowth'), stats.growth?.appointments, 'vs previous period');
        setGrowthDisplay(document.getElementById('doctorsGrowth'), stats.growth?.doctors, 'vs previous period');
        setGrowthDisplay(document.getElementById('customersGrowth'), stats.growth?.customers, 'vs previous period');
        setGrowthDisplay(document.getElementById('adminsGrowth'), stats.growth?.admins, 'vs previous period');
    } catch (err) {
        console.error("Dashboard stats error:", err);
    }
}

function getLastNDates(n) {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Show 4 days past, today, tomorrow, and day after tomorrow (7 days total)
    const startOffset = -(n - 3);
    const endOffset = 2;
    
    for (let i = startOffset; i <= endOffset; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().slice(0, 10));
    }
    return dates;
}

function formatDateLabel(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === 2) return 'Day after';
    
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function normalizeStatus(status) {
    const normalized = String(status || '').toLowerCase().trim();
    if (normalized === 'completed' || normalized === 'accepted' || normalized === 'accept') return 'Completed';
    if (normalized === 'pending') return 'Pending';
    return 'Rejected';
}

function updateAnalyticsCharts(appointments) {
    if (!appointmentsLineChart || !statusDoughnutChart) return;

    const labels = getLastNDates(7);
    const lineData = labels.map(() => 0);
    const statusCounts = { Completed: 0, Pending: 0, Rejected: 0 };

    appointments.forEach(appt => {
        const dateKey = appt.appointment_date ? String(appt.appointment_date).split('T')[0] : '';
        const idx = labels.indexOf(dateKey);
        if (idx !== -1) lineData[idx] += 1;

        const statusLabel = normalizeStatus(appt.status);
        statusCounts[statusLabel] = (statusCounts[statusLabel] || 0) + 1;
    });

    appointmentsLineChart.data.labels = labels.map(date => formatDateLabel(date));
    appointmentsLineChart.data.datasets[0].data = lineData;
    appointmentsLineChart.update();

    statusDoughnutChart.data.datasets[0].data = [statusCounts.Completed, statusCounts.Pending, statusCounts.Rejected];
    statusDoughnutChart.update();
}

/**
 * Load recent data into dashboard tables
 */
async function loadRecentActivity(filterType = 'recent', date = null, updateCharts = true) {
    try {
        let url = `${backendUrl}/api/admin/recent-activity`;
        const params = new URLSearchParams();

        if (filterType === 'all') {
            params.append('filterType', 'all');
        } else if (date) {
            params.append('filterType', 'date');
            params.append('date', date);
        } // else default to 'recent' (no params needed for default)
        if (params.toString()) url += `?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const { appointments, customers } = await response.json();
        
        // Populate Appointments
        const apptTbody = document.getElementById("recentAppointmentsTable");
        if (apptTbody) {
            apptTbody.innerHTML = appointments.length ? appointments.map(appt => {
                const appointmentDate = appt.appointment_date ? String(appt.appointment_date).split('T')[0] : '';
                const displayDate = appointmentDate ? new Date(appointmentDate).toLocaleDateString() : 'N/A';
                const statusText = String(appt.status || 'Unknown');

                return `
                <tr data-date="${appointmentDate}">
                    <td style="font-weight: 600;"><span class="slot-number" style="font-size: 0.85rem; font-weight: 600;">${appt.users?.user_id || 'N/A'}</span></td>
                    <td style="font-weight: 600;">${appt.patient_name || 'N/A'}</td>
                    <td style="font-weight: 600;"><div class="table-date">${displayDate}</div></td>
                    <td style="font-weight: 600;"><span class="slot-number" style="font-size: 0.85rem; font-weight: 600;">${appt.doctors?.doc_id || 'N/A'}</span></td>
                    <td style="font-weight: 600;"><div class="table-doctor">${appt.doctor_name || 'N/A'}</div></td>
                    <td style="font-weight: 600;"><div class="table-date" style="font-size: 0.85rem;">${appt.appointment_id || 'N/A'}</div></td>
                    <td style="font-weight: 600;"><span class="slot-number">${appt.booking_slot || '--'}</span></td>
                    <td><span class="status ${statusText.toLowerCase().replace(/\s+/g, '')}">${statusText}</span></td>
                    <td>
                        <div class="table-actions">
                            <button class="action-icon edit" title="Edit Appointment" onclick="window.openEditModal('${appt.id}')"><ion-icon name="create-outline"></ion-icon></button>
                            <button class="action-icon delete" title="Remove" onclick="window.deleteAppointment('${appt.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                        </div>
                    </td>
                </tr>
            `}).join('') : '<tr><td colspan="9" style="text-align:center">No appointments found.</td></tr>';
        }

        // Update Summary Box UI
        const summaryBox = document.getElementById("appointmentSummaryBox");
        if (summaryBox) {
            const dateTitle = summaryBox.querySelector(".info-text h3");
            const countBadge = document.getElementById("apptCountBadge");
            
            let displayDate = "";
            if (filterType === 'all') {
                displayDate = "All Time Appointments";
            } else if (date) {
                // Normalize dates to midnight for accurate day comparison
                const targetDate = new Date(date + "T00:00:00");
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                
                const diffTime = targetDate.getTime() - todayDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 0) displayDate = "Today's Appointments";
                else if (diffDays === -1) displayDate = "Yesterday's Appointments";
                else if (diffDays === 1) displayDate = "Tomorrow's Appointments";
                else displayDate = `Appointments for ${targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
            } else {
                displayDate = "Recent Appointments";
            }

            if (dateTitle) dateTitle.textContent = displayDate;
            if (countBadge) countBadge.textContent = `${appointments.length} Total`;
        }

        if (updateCharts) updateAnalyticsCharts(appointments);
    } catch (err) {
        console.error("Recent activity error:", err);
    }
}

/**
 * Load Appointments for the Master Registry Page
 */
async function loadAllAppointmentsRegistry(filterType = 'all', date = null) {
    const tbody = document.getElementById("allAppointmentsRegistryTable");
    if (!tbody) return;

    try {
        const url = date ? `${backendUrl}/api/admin/recent-activity?filterType=date&date=${date}` : `${backendUrl}/api/admin/recent-activity?filterType=all`;
        const response = await fetch(url);
        const { appointments } = await response.json();

        tbody.innerHTML = appointments.length ? appointments.map(appt => {
            return `
            <tr>
                <td style="font-weight: 600;"><span class="slot-number" style="font-size: 0.85rem; font-weight: 600;">${appt.users?.user_id || 'N/A'}</span></td>
                <td style="font-weight: 600;">${appt.patient_name}</td>
                <td style="font-weight: 600;"><div class="table-date">${new Date(appt.appointment_date).toLocaleDateString()}</div></td>
                <td style="font-weight: 600;"><span class="slot-number" style="font-size: 0.85rem; font-weight: 600;">${appt.doctors?.doc_id || 'N/A'}</span></td>
                <td style="font-weight: 600;"><div class="table-doctor">${appt.doctor_name}</div></td>
                <td style="font-weight: 600;"><div class="table-date" style="font-size: 0.85rem;">${appt.appointment_id}</div></td>
                <td style="font-weight: 600;"><span class="slot-number">${appt.booking_slot || '--'}</span></td>
                <td><span class="status ${appt.status.toLowerCase().replace(/\s+/g, '')}">${appt.status}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon edit" title="Edit Appointment" onclick="window.openEditModal('${appt.id}')"><ion-icon name="create-outline"></ion-icon></button>
                        <button class="action-icon delete" onclick="window.deleteAppointment('${appt.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                    </div>
                </td>
            </tr>
        `}).join('') : '<tr><td colspan="9" style="text-align:center">No appointments found.</td></tr>';

        const countBadge = document.getElementById("apptCountBadge");
        if (countBadge) countBadge.textContent = `${appointments.length} Total`;
    } catch (err) { console.error("Registry load error:", err); }
}

/**
 * Load Full Doctors Registry for alldoctors.html
 */
async function loadDoctorsRegistry() {
    const tbody = document.getElementById("doctorsRegistryTable");
    if (!tbody) return;

    try {
        const response = await fetch(`${backendUrl}/api/doctors`);
        const doctors = await response.json();

        tbody.innerHTML = doctors.length ? doctors.map(doc => `
            <tr>
                <td><span class="slot-number" style="font-size: 0.75rem; opacity: 0.8;">${(doc.id || '').slice(0, 8)}</span></td>
                <td>${doc.name}</td>
                <td>${doc.specialty}</td>
                <td>${doc.email || 'N/A'}</td>
                <td>${doc.state || 'N/A'}</td>
                <td>${doc.district || 'N/A'}</td>
                <td><span class="status ${doc.is_available ? 'accept' : 'reject'}">${doc.is_available ? 'Available' : 'Busy'}</span></td>
            </tr>
        `).join('') : '<tr><td colspan="7" style="text-align:center">No doctors registered</td></tr>';
    } catch (err) {
        console.error("Registry load error:", err);
    }
}

/**
 * Load Full Admins Registry for alladmins.html
 */
async function loadAdminsRegistry() {
    const tbody = document.getElementById("adminsRegistryTable");
    if (!tbody) return;

    try {
        const response = await fetch(`${backendUrl}/api/admins`);
        const admins = await response.json();

        tbody.innerHTML = admins.length ? admins.map(admin => `
            <tr>
                <td><span class="slot-number" style="font-size: 0.75rem; opacity: 0.8;">${(admin.id || '').slice(0, 8)}</span></td>
                <td>${admin.name}</td>
                <td>${admin.email || 'N/A'}</td>
                <td><div class="table-date">${admin.registration_date ? new Date(admin.registration_date).toLocaleDateString() : 'N/A'}</div></td>
                <td><span class="status accept">Active</span></td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center">No admins registered</td></tr>';
    } catch (err) {
        console.error("Admins registry load error:", err);
    }
}

/**
 * Load all users and doctors for alluser.html
 */
async function loadAllUsersPageData() {
    const tbody = document.getElementById("allUsersRegistryTable");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">Loading patients...</td></tr>';

    try {
        const response = await fetch(`${backendUrl}/api/admin/users`);
        const payload = await response.json();
        const users = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];

        if (!response.ok) {
            const errorMessage = payload?.error || payload?.message || 'Unable to load patient registry.';
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">${errorMessage}</td></tr>`;
            return;
        }

        tbody.innerHTML = users.length ? users.map(cust => `
            <tr>
                <td><span class="slot-number" style="font-size: 0.85rem; font-weight: 600;">${cust.user_id || 'N/A'}</span></td>
                <td style="font-weight: 600;">${cust.name || 'N/A'}</td>
                <td style="font-weight: 600;">${cust.email || 'N/A'}</td>
                <td style="font-weight: 600;">${cust.mobile || 'N/A'}</td>
                <td style="font-weight: 600;">${cust.country || 'N/A'}</td>
                <td style="font-weight: 600;">${cust.state || 'N/A'}</td>
                <td style="font-weight: 600;">${cust.district || 'N/A'}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-icon edit" title="Edit Profile" onclick="window.openEditUserModal('${cust.id}')"><ion-icon name="create-outline"></ion-icon></button>
                        <button class="action-icon delete" title="Delete User" onclick="window.deleteUser('${cust.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                    </div>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="8" style="text-align:center">No patients found.</td></tr>';
    } catch (err) {
        console.error("Error loading users page:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">Unable to load patients. Check backend connection.</td></tr>`;
    }
}

/**
 * Edit and Delete User Logic
 */
window.openEditUserModal = async function(userId) {
    const modal = document.getElementById("editUserModal");
    const appointmentsTable = document.getElementById("editUserAppointmentsTable");
    if (!modal) return;

    try {
        const [userResponse, appointmentsResponse] = await Promise.all([
            fetch(`${backendUrl}/api/user/${userId}`),
            fetch(`${backendUrl}/api/user/${userId}/appointments`)
        ]);

        const user = await userResponse.json();
        const appointments = await appointmentsResponse.json();

        document.getElementById("editUserId").value = user.id;
        document.getElementById("editUserUserId").value = user.user_id || "";
        document.getElementById("editUserRole").value = user.role || "";
        document.getElementById("editUserName").value = user.name || "";
        document.getElementById("editUserEmail").value = user.email || "";
        document.getElementById("editUserMobile").value = user.mobile || "";
        document.getElementById("editUserCountry").value = user.country || "";
        ensureSelectValue("editUserState", user.state || "");
        populateDistrictOptions(user.state || "", user.district || "");
        ensureSelectValue("editUserGender", user.gender || "");
        ensureSelectValue("editUserBloodGroup", user.blood_group || "");
        document.getElementById("editUserPincode").value = user.pincode || "";
        document.getElementById("editUserAadhaar").value = user.aadhaar || "";
        document.getElementById("editUserRegistrationDate").value = user.registration_date ? new Date(user.registration_date).toLocaleString() : "";
        document.getElementById("editUserLastLogin").value = user.last_login_date ? new Date(user.last_login_date).toLocaleString() : "";

        if (appointmentsResponse.ok && Array.isArray(appointments)) {
            appointmentsTable.innerHTML = appointments.length ? appointments.map(appt => `
                <tr>
                    <td>${appt.appointment_id || appt.id || 'N/A'}</td>
                    <td>${appt.appointment_date ? new Date(appt.appointment_date).toLocaleDateString() : 'N/A'}</td>
                    <td>${appt.doctor_name || appt.doctor_id || 'N/A'}</td>
                    <td>${appt.booking_slot || 'N/A'}</td>
                    <td>${appt.status || 'N/A'}</td>
                    <td>
                        <div class="table-actions">
                            <button class="action-icon edit" title="Modify" onclick="window.openEditModal('${appt.id}')"><ion-icon name="create-outline"></ion-icon></button>
                            <button class="action-icon delete" title="Delete" onclick="window.deleteAppointment('${appt.id}')"><ion-icon name="trash-outline"></ion-icon></button>
                        </div>
                    </td>
                </tr>
            `).join('') : '<tr><td colspan="6" style="text-align:center; padding: 16px;">No appointments found for this patient.</td></tr>';
        } else {
            appointmentsTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 16px;">Unable to load appointment history.</td></tr>`;
        }

        modal.style.display = "flex";
    } catch (err) {
        console.error("User edit load error:", err);
        if (appointmentsTable) {
            appointmentsTable.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 16px;">Unable to load appointment history.</td></tr>`;
        }
    }
};

window.deleteUser = async function(id) {
    showAdminModal("Confirm Deletion", "This will permanently remove the patient account and their history. Proceed?", "warning", async () => {
        try {
            const res = await fetch(`${backendUrl}/api/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showAdminModal("Deleted", "Patient account has been removed.");
                loadAllUsersPageData();
            } else {
                const result = await res.json();
                showAdminModal("Error", result.error || "Failed to delete user.", "error");
            }
        } catch (err) { console.error("Delete error:", err); }
    });
};

/**
 * Edit and Delete Appointment Logic
 */
window.openEditModal = async function(apptId) {
    const modal = document.getElementById("editAppointmentModal");
    const editForm = document.getElementById("editAppointmentForm");
    if (!modal) return;
    
    if (editForm) editForm.reset();

    try {
        const response = await fetch(`${backendUrl}/api/appointments/${apptId}`);
        const appt = await response.json();
        
        // Security Logic: Block modification of completed history
        if (appt.status && appt.status.toLowerCase() === 'completed') {
            showAdminModal("History Locked", "This appointment is marked as Completed and cannot be modified.", "warning");
            return;
        }

        document.getElementById("editApptId").value = appt.id;
        document.getElementById("editPatientName").value = appt.patient_name;
        document.getElementById("editApptDate").value = appt.appointment_date;
        document.getElementById("editSlot").value = appt.booking_slot || '';
        document.getElementById("editStatus").value = appt.status;

        if (allDoctorsForEdit.length === 0) {
            const docRes = await fetch(`${backendUrl}/api/doctors`);
            allDoctorsForEdit = await docRes.json();
        }
        
        // Set Specialty Value (Matches hardcoded list in HTML)
        const typeSelect = document.getElementById("editDoctorType");
        if (typeSelect) typeSelect.value = appt.doctor_type || "";

        // Populate Doctors based on specialty
        const populateDoctors = (specialty, selectedId) => {
            const docSelect = document.getElementById("editDoctorId");
            const formatDrName = (name) => /^dr/i.test(name) ? name : `Dr. ${name}`;
            const filteredDocs = allDoctorsForEdit.filter(doc => doc.specialty === specialty);
            
            docSelect.innerHTML = filteredDocs.map(doc => `
                <option value="${doc.id}" ${doc.id === selectedId ? 'selected' : ''}>${formatDrName(doc.name)}</option>
            `).join('');
        };

        populateDoctors(appt.doctor_type, appt.doctor_id);

        modal.style.display = "flex";
    } catch (err) { console.error("Edit load error:", err); }
};

window.deleteAppointment = async function(id) {
    showAdminModal("Confirm Delete", "Permanently delete this appointment record?", "warning", async () => {
        try {
            const res = await fetch(`${backendUrl}/api/admin/appointments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showAdminModal("Deleted", "Record removed successfully.");
                if (currentPage === "admin.html") loadRecentActivity('all');
                if (currentPage === "allappointments.html") loadAllAppointmentsRegistry();
            }
        } catch (err) { console.error("Delete error:", err); }
    });
};

window.quickStatusUpdate = async function(id, newStatus) {
    if (newStatus === 'Accepted') { window.openEditModal(id); return; }
    
    showAdminModal("Confirm Update", `Change status to ${newStatus}?`, 'warning', async () => {
        try {
            const fetchRes = await fetch(`${backendUrl}/api/appointments/${id}`);
            const appt = await fetchRes.json();
            
            const response = await fetch(`${backendUrl}/api/admin/appointments/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_name: appt.patient_name,
                    appointment_date: appt.appointment_date,
                    doctor_id: appt.doctor_id,
                    booking_slot: appt.booking_slot,
                    status: newStatus
                })
            });

            if (response.ok) {
                showAdminModal("Success", `Status changed to ${newStatus}`);
                if (currentPage === "admin.html") loadRecentActivity('all');
                if (currentPage === "allappointments.html") loadAllAppointmentsRegistry();
            }
        } catch (err) { showAdminModal("Error", "Failed to update status", 'error'); }
    });
};

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

    // Default fallback to Dashboard if on admin.html or root
    if (!matched || currentPage === "admin.html" || currentPage === "") {
        const dashboardLi = document.querySelector(".navigation li a[href='admin.html']");
        if (dashboardLi) dashboardLi.parentElement.classList.add("hovered");
    }
}

// Add hovered class to selected list item
let list = document.querySelectorAll(".navigation li");

function activelink() {
    // Prevent logo item from getting highlight class
    if (this.querySelector('.nav_logo') || this.parentElement.firstElementChild === this) return;
    
    list.forEach((item) => {
        item.classList.remove("hovered");
    });
    this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseenter", activelink));

/**
 * Unified Filtering Logic for Dashboard Data
 */
const searchInput = document.querySelector(".search input");

function applyUnifiedFilters() {
    const searchValue = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filters = [
        {
            selector: "#recentAppointmentsTable tr",
            matcher: row => {
                const userId = row.querySelector("td:nth-child(1)")?.innerText.toLowerCase() || "";
                const name = row.querySelector("td:nth-child(2)")?.innerText.toLowerCase() || "";
                const appointmentId = row.querySelector("td:nth-child(6)")?.innerText.toLowerCase() || "";
                return !searchValue || userId.includes(searchValue) || name.includes(searchValue) || appointmentId.includes(searchValue);
            }
        },
        {
            selector: "#doctorsRegistryTable tr",
            matcher: row => {
                const id = row.querySelector("td:nth-child(1)")?.innerText.toLowerCase() || "";
                const name = row.querySelector("td:nth-child(2)")?.innerText.toLowerCase() || "";
                return !searchValue || id.includes(searchValue) || name.includes(searchValue);
            }
        },
        {
            selector: "#adminsRegistryTable tr",
            matcher: row => {
                const id = row.querySelector("td:nth-child(1)")?.innerText.toLowerCase() || "";
                const name = row.querySelector("td:nth-child(2)")?.innerText.toLowerCase() || "";
                return !searchValue || id.includes(searchValue) || name.includes(searchValue);
            }
        },
        {
            selector: "#allUsersRegistryTable tr",
            matcher: row => {
                const id = row.querySelector("td:nth-child(1)")?.innerText.toLowerCase() || "";
                const name = row.querySelector("td:nth-child(2)")?.innerText.toLowerCase() || "";
                return !searchValue || id.includes(searchValue) || name.includes(searchValue);
            }
        }
    ];

    filters.forEach(({ selector, matcher }) => {
        document.querySelectorAll(selector).forEach(row => {
            row.style.display = matcher(row) ? "" : "none";
        });
    });

    // Update real-time count in summary box
    const apptTable = document.getElementById("recentAppointmentsTable");
    if (apptTable) {
        const visibleCount = Array.from(apptTable.querySelectorAll("tr"))
                                  .filter(row => row.style.display !== "none" && !row.innerText.includes("No appointments")).length;
        const countBadge = document.getElementById("apptCountBadge");
        if (countBadge) countBadge.textContent = `${visibleCount} Records`;
    }
}

/**
 * Helper for calculating date strings
 */
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/**
 * Setup specialized day filters (Yesterday, Today, Tomorrow)
 */
function setupDayFilters() {
    const filterTabs = document.querySelectorAll(".filter-tab");
    const viewAllAppointmentsBtn = document.getElementById("viewAllAppointmentsBtn");

    filterTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            filterTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const day = tab.dataset.day;
            let targetDate = ""; // YYYY-MM-DD
            if (day === "yesterday") targetDate = getFormattedDate(-1);
            else if (day === "today") targetDate = getFormattedDate(0);
            else if (day === "tomorrow") targetDate = getFormattedDate(1);

            // Trigger refresh based on page
            if (apptDateFilter) apptDateFilter.value = targetDate;
            if (currentPage === "allappointments.html") {
                loadAllAppointmentsRegistry('date', targetDate).then(() => applyUnifiedFilters());
            } else {
                loadRecentActivity('date', targetDate, false).then(() => applyUnifiedFilters());
            }
        });
    });
}

// Event Listeners for Filters
if (searchInput) {
    searchInput.addEventListener("keyup", applyUnifiedFilters);
}

/**
 * Initialize Charts with professional data visualization
 */
function initDashboardCharts() {
    const appCtx = document.getElementById('myChart');
    const earnCtx = document.getElementById('earning');

    if (appCtx) {
        appointmentsLineChart = new Chart(appCtx, {
            type: 'line',
            data: {
                labels: getLastNDates(7).map(date => formatDateLabel(date)),
                datasets: [{
                    label: 'Appointments',
                    data: Array(7).fill(0),
                    borderColor: '#12ac8e',
                    backgroundColor: 'rgba(18, 172, 142, 0.15)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Weekly Appointment Traffic' }
                }
            }
        });
    }

    if (earnCtx) {
        statusDoughnutChart = new Chart(earnCtx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Pending', 'Rejected'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#2e7d32', '#f18c35', '#d32f2f'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: { display: true, text: 'Appointment Status Ratio' },
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

/**
 * Live Clock for Dashboard Header
 */
function updateLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    clockEl.innerText = now.toLocaleDateString('en-US', options);
}

// Reset highlighting to the actual active tab when mouse leaves sidebar
const navigationContainer = document.querySelector(".navigation");
if (navigationContainer) {
    navigationContainer.addEventListener("mouseleave", highlightActiveTab);
}

document.addEventListener("DOMContentLoaded", () => {
    highlightActiveTab();
    loadWelcomeName();
    
    // Calendar date filter interaction
    if (apptDateFilter) {
        apptDateFilter.addEventListener("change", (e) => {
            const selectedDate = e.target.value;
            if (!selectedDate) return;
            
            // Deactivate quick day filter tabs (Yesterday/Today/Tomorrow) when a custom date is picked
            document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));

            if (currentPage === "allappointments.html") {
                loadAllAppointmentsRegistry('date', selectedDate).then(() => applyUnifiedFilters());
            } else {
                loadRecentActivity('date', selectedDate, false).then(() => applyUnifiedFilters());
            }
        });
    }

    // Edit Modal Interaction
    const editDocType = document.getElementById("editDoctorType");
    if (editDocType) {
        editDocType.addEventListener("change", (e) => {
            const specialty = e.target.value;
            const docSelect = document.getElementById("editDoctorId");
            const formatDrName = (name) => /^dr/i.test(name) ? name : `Dr. ${name}`;
            
            const filteredDocs = allDoctorsForEdit.filter(doc => doc.specialty === specialty);
            docSelect.innerHTML = filteredDocs.map(doc => `
                <option value="${doc.id}">${formatDrName(doc.name)}</option>
            `).join('');
            
            if (filteredDocs.length === 0) {
                docSelect.innerHTML = '<option value="" disabled selected>No doctors available</option>';
            }
        });
    }

    const editModal = document.getElementById("editAppointmentModal");
    const closeEditBtn = document.getElementById("closeEditModal");
    
    if (closeEditBtn) {
        closeEditBtn.onclick = () => editModal.style.display = "none";
    }

    window.addEventListener("click", (e) => {
        if (e.target === editModal) editModal.style.display = "none";
    });

    document.getElementById("modalConfirmBtn")?.addEventListener("click", () => {
        if (pendingModalAction) { pendingModalAction(); pendingModalAction = null; }
        document.getElementById("adminActionModal").style.display = "none";
    });

    document.getElementById("modalCloseBtn")?.addEventListener("click", () => {
        document.getElementById("adminActionModal").style.display = "none";
        pendingModalAction = null;
    });

    window.addEventListener("click", (e) => {
        if (e.target === document.getElementById("adminActionModal")) document.getElementById("adminActionModal").style.display = "none";
    });

    const editForm = document.getElementById("editAppointmentForm");
    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("editApptId").value;
            const body = {
                patient_name: document.getElementById("editPatientName").value,
                appointment_date: document.getElementById("editApptDate").value,
                doctor_id: document.getElementById("editDoctorId").value,
                booking_slot: document.getElementById("editSlot").value,
                status: document.getElementById("editStatus").value
            };

            try {
                const res = await fetch(`${backendUrl}/api/admin/appointments/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const result = await res.json();
                if (res.ok) {
                    showAdminModal("Success", result.message);
                    document.getElementById("editAppointmentModal").style.display = "none";
                    if (currentPage === "admin.html") loadRecentActivity('all');
                    if (currentPage === "allappointments.html") loadAllAppointmentsRegistry();
                    if (currentPage === "alluser.html") {
                        const activeUserId = document.getElementById("editUserId").value;
                        if (activeUserId) window.openEditUserModal(activeUserId);
                    }
                } else { showAdminModal("Error", result.error, 'error'); }
            } catch (err) { console.error("Update error:", err); }
        });
    }

    // Edit User Modal Interaction
    const closeUserBtn = document.getElementById("closeUserModal");
    const stateSelect = document.getElementById("editUserState");
    const districtSelect = document.getElementById("editUserDistrict");
    const manualDistrictInput = document.getElementById("editUserDistrictManual");

    if (stateSelect) {
        stateSelect.addEventListener("change", (e) => {
            populateDistrictOptions(e.target.value);
        });
    }

    if (districtSelect && manualDistrictInput) {
        districtSelect.addEventListener("change", (e) => {
            if (e.target.value === "__other__") {
                manualDistrictInput.style.display = "block";
                manualDistrictInput.focus();
            } else {
                manualDistrictInput.style.display = "none";
                manualDistrictInput.value = "";
            }
        });
    }

    if (closeUserBtn) {
        closeUserBtn.onclick = () => document.getElementById("editUserModal").style.display = "none";
    }

    const userEditForm = document.getElementById("editUserForm");
    if (userEditForm) {
        userEditForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("editUserId").value;
            const districtSelect = document.getElementById("editUserDistrict");
            const manualDistrictInput = document.getElementById("editUserDistrictManual");
            const districtValue = districtSelect?.value === "__other__" ? manualDistrictInput.value.trim() : districtSelect?.value;

            const body = {
                name: document.getElementById("editUserName").value,
                email: document.getElementById("editUserEmail").value,
                mobile: document.getElementById("editUserMobile").value,
                country: document.getElementById("editUserCountry").value,
                state: document.getElementById("editUserState").value,
                district: districtValue,
                pincode: document.getElementById("editUserPincode").value,
                gender: document.getElementById("editUserGender").value,
                aadhaar: document.getElementById("editUserAadhaar").value,
                blood_group: document.getElementById("editUserBloodGroup").value
            };

            try {
                const res = await fetch(`${backendUrl}/api/admin/users/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const result = await res.json();
                if (res.ok) {
                    showAdminModal("Success", "Profile updated successfully.");
                    document.getElementById("editUserModal").style.display = "none";
                    loadAllUsersPageData();
                } else { showAdminModal("Error", result.error, 'error'); }
            } catch (err) { console.error("Update error:", err); }
        });
    }

    // Navigation logic cleaned: Links now follow href to new pages.
    // Sidebar auto-close on mobile
    document.querySelectorAll(".navigation li a").forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 991) {
                navigation.classList.remove("active");
                main.classList.remove("active");
                document.querySelector(".main-overlay")?.classList.remove("active");
            }
        });
    });

    // View All Appointments Handler
    const viewAllBtn = document.getElementById("viewAllAppointmentsBtn");
    if (viewAllBtn && currentPage === "admin.html") {
        viewAllBtn.addEventListener("click", (e) => {
            // Allow navigation to allappointments.html as set in HTML
        });
    }

    if (currentPage === "admin.html") {
        const todayStr = getFormattedDate(0);

        initDashboardCharts(); // Initialize first so activity load can populate them
        setupDayFilters();
        
        if (apptDateFilter) apptDateFilter.value = todayStr;

        // Initial load sequence: 
        // 1. Stats and Charts get full data overview.
        // 2. Table view specifically defaults to 'Today'.
        Promise.all([
            updateDashboardStats('all'),
            loadRecentActivity('all') // Populates charts
        ]).then(() => {
            return loadRecentActivity('date', todayStr, false); // Populates table with Today
        }).then(() => applyUnifiedFilters());

        updateLiveClock();
        setInterval(updateLiveClock, 60000);
    }
    if (currentPage === "allappointments.html") {
        const todayStr = getFormattedDate(0);
        if (apptDateFilter) apptDateFilter.value = todayStr;

        setupDayFilters();

        // Highlight the "Today" filter tab by default
        document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
        const todayTab = document.querySelector(".filter-tab[data-day='today']");
        if (todayTab) todayTab.classList.add("active");

        loadAllAppointmentsRegistry('date', todayStr).then(() => applyUnifiedFilters());
    }
    if (currentPage === "alluser.html") {
        loadAllUsersPageData();
    }
    if (currentPage === "alldoctors.html") {
        loadDoctorsRegistry();
    }
    if (currentPage === "alladmins.html") {
        loadAdminsRegistry();
    }

    // Initialize Backdrop Overlay for Mobile
    if (!document.querySelector(".main-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "main-overlay";
        document.body.appendChild(overlay);
        
        overlay.onclick = function() {
            navigation.classList.remove("active");
            main.classList.remove("active");
            overlay.classList.remove("active");
        };
    }

    // Handle Add Doctor Form Submission
    const addDoctorForm = document.getElementById("addDoctorForm");
    if (addDoctorForm) {
        addDoctorForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("docName").value;
            const email = document.getElementById("docEmail").value;
            const specialty = document.getElementById("doctorSpecialty").value;
            const password = document.getElementById("docPassword").value;

            try {
                const response = await fetch(`${backendUrl}/api/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, role: 'Doctor', specialty })
                });
                const result = await response.json();
                if (response.ok) {
                    showAdminModal("Success", "Doctor account created successfully!");
                    addDoctorForm.reset();
                    setTimeout(() => window.location.href = "alldoctors.html", 2000);
                } else {
                    showAdminModal("Error", result.error || "Failed to register doctor.", 'error');
                }
            } catch (err) { console.error(err); }
        });
    }

    // Handle Add User Form Submission
    const addUserForm = document.getElementById("addUserForm");
    if (addUserForm) {
        addUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("patName").value;
            const email = document.getElementById("patEmail").value;
            const mobile = document.getElementById("patMobile").value;
            const password = document.getElementById("patPassword").value;

            try {
                const response = await fetch(`${backendUrl}/api/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, role: 'User', mobile })
                });
                const result = await response.json();
                if (response.ok) {
                    showAdminModal("Success", "Patient profile registered successfully!");
                    addUserForm.reset();
                    setTimeout(() => window.location.href = "alluser.html", 2000);
                } else {
                    showAdminModal("Error", result.error || "Failed to register patient.", 'error');
                }
            } catch (err) { console.error(err); }
        });
    }

    // Handle Admin Password Change
    const adminPasswordForm = document.getElementById("adminPasswordForm");
    if (adminPasswordForm) {
        adminPasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const adminId = localStorage.getItem("userId");

            if (newPassword !== confirmPassword) {
                showAdminModal("Validation Error", "New passwords do not match.", 'error');
                return;
            }

            // Complexity validation
            const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passwordRegex.test(newPassword)) {
                showAdminModal("Security Policy", "Password must be 8+ chars with letters, numbers, and symbols.", 'warning');
                return;
            }

            try {
                const response = await fetch(`${backendUrl}/api/admin/${adminId}/password`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                const result = await response.json();
                if (response.ok) {
                    showAdminModal("Success", "Admin password updated successfully.");
                    adminPasswordForm.reset();
                } else {
                    showAdminModal("Action Failed", result.error || "Incorrect current password.", 'error');
                }
            } catch (err) { console.error(err); }
        });
    }

    // Handle Add Admin Form Submission
    const addAdminForm = document.getElementById("addAdminForm");
    if (addAdminForm) {
        addAdminForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("adminName").value;
            const email = document.getElementById("adminEmail").value;
            const password = document.getElementById("adminPassword").value;

            try {
                const response = await fetch(`${backendUrl}/api/signup`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password, role: 'Admin' })
                });
                const result = await response.json();
                if (response.ok) {
                    showAdminModal("Success", "Admin registered successfully!");
                    addAdminForm.reset();
                    window.location.href = "alladmins.html";
                } else {
                    showAdminModal("Error", result.error || "Failed to register admin.", 'error');
                }
            } catch (err) {
                console.error("Signup error:", err);
            }
        });
    }
});


// menu toggle
const toggle = document.querySelector(".toggle");
const navigation = document.querySelector(".navigation");
const main = document.querySelector(".main");

if (toggle && navigation && main) {
    toggle.onclick = function () {
        navigation.classList.toggle("active");
        main.classList.toggle("active");
        document.querySelector(".main-overlay")?.classList.toggle("active");
    };
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

// Logout handling
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        localStorage.clear();
        window.location.replace("../index.html");
    });
}