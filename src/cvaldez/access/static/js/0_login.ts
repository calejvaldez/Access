// DOM Variables
let access_data_text = document.getElementById('text-to-access-data') as HTMLParagraphElement;
let input_username = document.getElementById('input-username') as HTMLInputElement;
let input_password = document.getElementById('input-password') as HTMLInputElement;
let button_login = document.getElementById('button-login') as HTMLButtonElement;
let button_signup = document.getElementById('button-signup') as HTMLButtonElement;
let banner = document.getElementById('banner') as HTMLDivElement;

// Variables
let apps = {};

// Interfaces
interface Identity {
    id: string
    username: string
    joined: string
    type: string
    has_totp: boolean
}


// Helper functions
function getRedirect(): string {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    let forward_to = urlParams.get('app');

    // If App ID in object, return app ID
    if (apps[forward_to as string]) {
        return forward_to as string;
    } else {
        // Returns user to Access
        return "0";
    }
}

function set_banner(banner: HTMLDivElement, text: string, type: "success" | "warning" | "error") {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

// Handle Request Functions
function handleRequest_Apps() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        apps = JSON.parse(this.responseText);
    } else {
        apps = {'0': {name: 'Access', url: '/access/settings/'}}
    }

    access_data_text.textContent = `To use ${apps[getRedirect()].name}, please log in.`;
}

function handleRequest_Info() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data: Identity = JSON.parse(this.responseText);
        localStorage.setItem('cvd_identity', JSON.stringify(data));

        window.location.href = apps[getRedirect()].url;

        button_login.textContent = "Logging in...";
    } else if (this.readyState === XMLHttpRequest.DONE) {
        button_login.disabled = false;
        button_login.textContent = "Log in";
    }
}

function handleRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        // data.token, data.totp_required, data.message as per API
        let data = JSON.parse(this.responseText);

        if (localStorage.getItem('cvd_token')) {
            localStorage.removeItem('cvd_token');
        }
        localStorage.setItem('cvd_token', data.token);

        button_login.textContent = "Logging in...";

        if (data.totp_required === true) {
            window.location.href = `/access/login-otp/?${urlF}`
        } else {
            let xhttp = new XMLHttpRequest();
            xhttp.open('GET', '/api/access/verify-login/');
            xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
            xhttp.onreadystatechange = handleRequest_Info;
            xhttp.send();
        }

    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        let data = JSON.parse(this.responseText);
        set_banner(banner, data.message, 'error');
    } else if (this.readyState === XMLHttpRequest.DONE) {
        set_banner(banner, 'ERROR: An unknown error occurred.', 'error')
    }

    button_login.disabled = false;
    button_login.textContent = "Log in";
}

// Event listeners
button_login.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

   if (input_username.value === '' || input_password.value === '') {
       set_banner(banner, 'ERROR: Please fill out username and password.', 'error');
   } else {
       button_login.disabled = true;
       button_login.textContent = "Working...";

       let xhttp = new XMLHttpRequest();
       xhttp.open('POST', '/api/access/login/');
       xhttp.onreadystatechange = handleRequest;

       xhttp.send(JSON.stringify({
           "username": input_username.value,
           "password": input_password.value,
           "setup": false
       }));
   }
});

button_signup.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

    window.location.href = `/access/signup/?${urlF}`;
});

let apps_xhttp = new XMLHttpRequest();
apps_xhttp.open('GET', '/api/access/apps/');
apps_xhttp.onreadystatechange = handleRequest_Apps;
apps_xhttp.send()

let urlF = `app=${getRedirect()}`;

// Automatically log user in
if (localStorage.getItem('cvd_token') !== '') {
    button_login.disabled = true;
    button_login.textContent = "Working...";

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/verify-login/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = handleRequest_Info;
    xhttp.send();
}
