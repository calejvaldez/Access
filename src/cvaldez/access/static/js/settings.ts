// DOM Variables
let settings_banner = document.getElementById('banner') as HTMLDivElement;
let settings_button_edit_username = document.getElementById('button-edit-username') as HTMLButtonElement;
let settings_button_edit_password = document.getElementById('button-edit-password') as HTMLButtonElement;
let settings_hello_user = document.getElementById('hello-user') as HTMLHeadingElement;
let settings_join_date = document.getElementById('joined-date') as HTMLParagraphElement;

// Helper functions
function settings_getStringDate(ts: string): string {
    let utcSeconds = parseFloat(ts);
    let d = new Date(0);
    d.setUTCSeconds(utcSeconds);


    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']


    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function settings_set_banner(banner: HTMLDivElement, text: string, type: 'success' | 'warning' | 'error') {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

// Handle API Requests
function settings_handleRequest_Info() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        localStorage.setItem('cvd_identity', JSON.stringify(data));

        settings_hello_user.textContent = `Hello, ${data.username}!`
        settings_join_date.textContent = `Joined: ${settings_getStringDate(data.joined)}`
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        window.location.href = `/access/login/?forward=0`
    }
}

// Event listeners
settings_button_edit_username.addEventListener('click', () => {
    window.location.href = "/access/settings-username/"
});

settings_button_edit_password.addEventListener('click', () => {
    window.location.href = "/access/settings-password/"
})

// Automatically log user in
if (localStorage.getItem('cvd_token') !== '') {
    if (localStorage.getItem('cvd_identity') !== null) {
        let settings_identity = JSON.parse(localStorage.getItem('cvd_identity') as string);

        settings_hello_user.textContent = `Hello, ${settings_identity.username}!`;
        settings_join_date.textContent = `Joined: ${settings_getStringDate(settings_identity.joined)}`
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/verify-login/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = settings_handleRequest_Info;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}
