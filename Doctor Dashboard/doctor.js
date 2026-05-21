// add hovered class to selected list item
let list = document.querySelectorAll(".navigation li");

function activelink(){
    list.forEach((item) => {
        item.classList.remove("hovered");
    });
    this.classList.add("hovered");
}

list.forEach((item) => item.addEventListener("mouseover", activelink));

// menu toggle
let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

toggle.onclick = function () {
    navigation.classList.toggle("active");
    main.classList.toggle("active");
}

// Dynamic Close Button for Mobile Sidebar
if (navigation) {
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