// Landing Page JavaScript

document.addEventListener('DOMContentLoaded', () => {

    // Highlight navigation links when clicked
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {

        link.addEventListener('click', () => {

            navLinks.forEach(nav => {
                nav.classList.remove('active');
            });

            link.classList.add('active');

        });

    });


    // Mobile Navigation
    const menuToggle = document.getElementById('menuToggle');
    const navLinksContainer = document.getElementById('navLinks');

    if (menuToggle && navLinksContainer) {

        // Toggle mobile navigation
        menuToggle.addEventListener('click', () => {

            navLinksContainer.classList.toggle('show');

            const isOpen = navLinksContainer.classList.contains('show');

            menuToggle.setAttribute('aria-expanded', isOpen);

            menuToggle.setAttribute(
                'aria-label',
                isOpen ? 'Close navigation menu' : 'Open navigation menu'
            );

        });


        // Close menu after clicking a navigation link
        navLinksContainer.querySelectorAll('a').forEach(link => {

            link.addEventListener('click', () => {

                navLinksContainer.classList.remove('show');
                menuToggle.setAttribute('aria-expanded', 'false');

                menuToggle.setAttribute(
                    'aria-label',
                    'Open navigation menu'
                );

            });

        });

    }

    // Update footer year automatically
    const footerYear = document.querySelector('.footer-bottom p');
    if (footerYear) {

        footerYear.innerHTML =
            `&copy; ${new Date().getFullYear()} FUTA E-Voting Platform. Academic Project Prototype.`;

    }

});