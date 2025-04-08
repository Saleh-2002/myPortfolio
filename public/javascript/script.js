document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname
    const place = document.getElementsByClassName('Place')[0]
    const navLink = document.querySelector(`a[href="${currentPath}"]`); // Select the <a> tag based on the path
    const navItems = {
        '/Home': 'Home',
        '/MyProjects': 'My Projects',
        '/AboutMe': 'About Me',
        '/Settings': 'Settings',
        '/MyAI': 'AI',
    }

    if (navItems[currentPath]) {
        navLink.classList.add('Selected');
        place.textContent = navItems[currentPath]
    }

});

document.addEventListener("DOMContentLoaded", async function () {
    const SelectElement = document.getElementById('Nationality');
    try {
        const response = await fetch("https://restcountries.com/v2/all")
        if (!response.ok) throw new Error(`Error fetching ${response.status}: ${response.statusText}`);
        const data = await response.json();
        data.forEach(country => {
            const option = document.createElement("option");
            option.value = country.alpha3Code;
            option.text = country.name;
            SelectElement.appendChild(option);
        })

    }
    catch (err) {
        console.error(err);
    }
})
function checkInfo(event) {
    const Email = document.getElementById('Email').value.trim();
    const Password = document.getElementById('password').value.trim();
    const PhoneNumber = document.getElementById('PhoneNumber').value.trim();
    const Username = document.getElementById('username').value.trim();
    const BirthDate = document.getElementById('BirthDate').value.trim();
    const Nationality = document.getElementById('Nationality').value;
    const ErrorMessage = document.getElementById('ErrorMessage');
    const CorrectMessage = document.getElementById("correct");


    let errors = [];
    let corrects = [];

    // Validation checks
    !Email ? errors.push("Email is required.") : corrects.push("Email is correct.");

    Password.length < 8 ? errors.push("Password must be at least 8 characters long.") : corrects.push("Password is correct.");

    PhoneNumber.length !== 10 || isNaN(PhoneNumber) ? errors.push("Phone number must be exactly 10 digits.") : corrects.push("Phone number is correct.");

    !Username ? errors.push("Username is required.") : corrects.push("Username is correct.");

    !BirthDate ? errors.push("Birth date is required.") : corrects.push("Birth date is correct.");

    Nationality === "None" ? errors.push("Nationality is required.") : corrects.push("Nationality is correct.");

    // Clear previous messages
    ErrorMessage.innerHTML = "";
    CorrectMessage.innerHTML = "";

    // Show errors if any
    // Show correct messages first
    if (corrects.length > 0) {
        const ul = document.createElement("ul");
        ul.classList.add("correct");

        corrects.forEach((msg) => {
            const li = document.createElement("li");
            li.textContent = msg;
            ul.appendChild(li);
        });

        CorrectMessage.appendChild(ul);
    }

    // Show errors
    if (errors.length > 0) {
        const ul = document.createElement("ul");
        ul.classList.add("error");

        errors.forEach((error) => {
            const li = document.createElement("li");
            li.textContent = error;
            ul.appendChild(li);
        });

        ErrorMessage.appendChild(ul);
        event.preventDefault();
        return false;
    }


    return true;
}
setInterval(checkInfo, 10);
function clicked() {
    alert("Hello, World!");
}

function Time() {
    const time = new Date();
    const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
    document.getElementById('Time').innerText = `KSA: ${timeString}`;
}
setInterval(Time, 10);