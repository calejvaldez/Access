let button_login = document.getElementById('button-login');
let input_otp = document.getElementById('input-otp');
let banner = document.getElementById('banner');

let apps = [{name: "Access", url: "/access/settings/"}];

function getRedirect() {
    let queryString = window.location.search;
    let urlParams = new URLSearchParams(queryString);
    let forward_to = urlParams.get('forward')

    if (apps[parseInt(forward_to)]) {
        return parseInt(forward_to);
    } else {
        return 0
    }
}

let urlF = `forward=${getRedirect()}`;

function handleInfoRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        localStorage.setItem('usernameAndJoinDate', JSON.stringify({username: data.username, joined: data.joined}))

        window.location.href = apps.at(getRedirect()).url;

        button_login.textContent = "Logging in...";
    } else if (this.readyState === XMLHttpRequest.DONE) {
        button_login.disabled = false;
        button_login.textContent = "Log in";
    }
}

function set_banner(banner, text, type) {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

function handleRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        // data.token, data.success as per API
        let data = JSON.parse(this.responseText);

        if (data.success === true) {
            if (localStorage.getItem('cvd_token') !== '') {
                localStorage.removeItem('cvd_token');
            }

            localStorage.setItem('cvd_token', data.token);

            let xhttp = new XMLHttpRequest();
            xhttp.open('GET', '/api/access/info/');
            xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
            xhttp.onreadystatechange = handleInfoRequest;
            xhttp.send();
        } else {
            set_banner(banner, "ERROR: Code is invalid or has expired. Please try again.", "error");

            button_login.disabled = false;
            button_login.textContent = "Log in";
        }

    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        localStorage.removeItem("cvd_token");
        window.location.href = `/access/login/?${urlF}`;
    } else if (this.readyState === XMLHttpRequest.DONE) {
        set_banner(banner, "An unknown error occurred.", 'error');

        button_login.disabled = false;
        button_login.textContent = "Log in";
    }
}

button_login.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

   if (input_otp.value === '') {
       set_banner(banner, 'ERROR: Please enter the 6-digit code below.', 'error');
   } else if (input_otp.value.length < 6) {
       set_banner(banner, `ERROR: You entered less than 6 digits. Please enter a 6-digit code.`, 'error')
   } else {
       button_login.disabled = true;
       button_login.textContent = "Working...";

       let xhttp = new XMLHttpRequest();
       xhttp.open('POST', '/api/access/totp/');
       xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));

       xhttp.onreadystatechange = handleRequest;

       xhttp.send(JSON.stringify({
           "setup": false,
           "code": input_otp.value
       }));
   }
});

if (localStorage.getItem('cvd_token') !== '') {
    button_login.disabled = true;
    button_login.textContent = "Working...";

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
}

