document.addEventListener('DOMContentLoaded', function () {
    const currentPath = window.location.pathname
    const place = document.getElementsByClassName('Place')[0]
    const navLink = document.querySelector(`a[href="${currentPath}"]`); // Select the <a> tag based on the path
    const navItems = {
        '/Home': 'Home',
        '/MyProjects': 'My Projects',
        '/AboutMe': 'About Me'
    }


    if (navItems[currentPath]) {
        navLink.classList.add('Selected'); 
        place.textContent = navItems[currentPath]
    }

});