// DOM Variables
let otp_button_login = document.getElementById('button-login') as HTMLButtonElement;
let otp_input = document.getElementById('input-otp') as HTMLInputElement;
let otp_banner = document.getElementById('banner') as HTMLDivElement;

// Variables
let otp_apps = {};

// Helper functions
function otp_getRedirect(): string {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    let forward_to = urlParams.get('app');

    // If App ID in object, return app ID
    if (otp_apps[forward_to as string]) {
        return forward_to as string;
    } else {
        // Returns user to Access
        return "0";
    }
}

function otp_set_banner(banner: HTMLDivElement, text: string, type: "success" | "warning" | "error") {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

// Handle API Requests
function otp_handleRequest_Info() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);
        localStorage.setItem('cvd_identity', JSON.stringify(data));

        window.location.href = otp_apps[otp_getRedirect()].url;

        otp_button_login.textContent = "Logging in...";
    } else if (this.readyState === XMLHttpRequest.DONE) {
        otp_button_login.disabled = false;
        otp_button_login.textContent = "Log in";
    }
}

function handleRequest_Login() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        // data.token, data.success as per API
        let data = JSON.parse(this.responseText);

        if (data.success === true) {
            if (localStorage.getItem('cvd_token') !== '') {
                localStorage.removeItem('cvd_token');
            }

            localStorage.setItem('cvd_token', data.token);

            let xhttp = new XMLHttpRequest();
            xhttp.open('GET', '/api/access/verify-login/');
            xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
            xhttp.onreadystatechange = otp_handleRequest_Info;
            xhttp.send();
        } else {
            otp_set_banner(otp_banner, "ERROR: Code is invalid or has expired. Please try again.", "error");

            otp_button_login.disabled = false;
            otp_button_login.textContent = "Log in";
        }

    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        localStorage.removeItem("cvd_token");
        window.location.href = `/access/login/?${otp_urlF}`;
    } else if (this.readyState === XMLHttpRequest.DONE) {
        otp_set_banner(otp_banner, "An unknown error occurred.", 'error');

        otp_button_login.disabled = false;
        otp_button_login.textContent = "Log in";
    }
}

function otp_handleRequest_Apps() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        otp_apps = JSON.parse(this.responseText);
    } else {
        otp_apps = {'0': {name: 'Access', url: '/access/settings/'}}
    }

    otp_urlF = `app=${otp_getRedirect()}`

    // Automatically log user in
    if (localStorage.getItem('cvd_token') !== '') {
        otp_button_login.disabled = true;
        otp_button_login.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('GET', '/api/access/verify-login/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
        xhttp.onreadystatechange = otp_handleRequest_Info;
        xhttp.send();
    }
}

// Event listeners
otp_button_login.addEventListener('click', () => {
    while (otp_banner.lastChild) {
        otp_banner.lastChild.remove();
    }

   if (otp_input.value === '') {
       otp_set_banner(otp_banner, 'ERROR: Please enter the 6-digit code below.', 'error');
   } else if (otp_input.value.length < 6) {
       otp_set_banner(otp_banner, `ERROR: You entered less than 6 digits. Please enter a 6-digit code.`, 'error')
   } else {
       otp_button_login.disabled = true;
       otp_button_login.textContent = "Working...";

       let xhttp = new XMLHttpRequest();
       xhttp.open('POST', '/api/access/totp/');
       xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);

       xhttp.onreadystatechange = handleRequest_Login;

       xhttp.send(JSON.stringify({
           "setup": false,
           "code": otp_input.value
       }));
   }
});

// Once page loads
let otp_apps_xhttp = new XMLHttpRequest();
otp_apps_xhttp.open('GET', '/api/access/apps/');
otp_apps_xhttp.onreadystatechange = otp_handleRequest_Apps;
otp_apps_xhttp.send()

let otp_urlF: string | null = null;