document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname
    const place = document.getElementsByClassName('Place')[0]
    const navLink = document.querySelector(`a[href="${currentPath}"]`); // Select the <a> tag based on the path
    const navItems = {
        '/Home': 'Home',
        '/MyProjects': 'My Projects',
        '/AboutMe': 'About Me', 
        '/Settings': 'Settings'
    }

    if (navItems[currentPath]) {
        navLink.classList.add('Selected'); 
        place.textContent = navItems[currentPath]
    }

});

function Time() {
    const time = new Date();
    const timeString = `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
    document.getElementById('Time').innerText = `KSA: ${timeString}`;
}
setInterval(Time, 10);