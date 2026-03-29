import React from 'react';

const Footer = () => {
    return (
        <footer>
            <nav>
                <ul>
                    <li><a href="/terms-of-service">Terms of Service</a></li>
                    <li><a href="/privacy-policy">Privacy Policy</a></li>
                    <li><a href="/cookies-policy">Cookies Policy</a></li>
                </ul>
            </nav>
            <p>&copy; {new Date().getFullYear()} XxArmaMortalxX. All rights reserved.</p>
        </footer>
    );
};

export default Footer;