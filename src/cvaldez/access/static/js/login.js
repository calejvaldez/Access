let access_data_text = document.getElementById('text-to-access-data');
let input_username = document.getElementById('input-username');
let input_password = document.getElementById('input-password');
let button_login = document.getElementById('button-login');
let button_signup = document.getElementById('button-signup');
let banner = document.getElementById('banner');

let apps = [{name: "Access", url: "/account/"},
    {name: "Love Letters", url: "/love/"},
    {name: "Admin View", url: "/admin/"},
    {name: "Roommate Portal", url: "/roommates/"}];

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

let urlF = `forward=${getRedirect()}`;
access_data_text.textContent = `To use ${apps[getRedirect()].name}, please log in.`;

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
            window.location.href = `/account/login/otp/?${urlF}`
        } else {
            let xhttp = new XMLHttpRequest();
            xhttp.open('GET', '/api/account/info/');
            xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
            xhttp.onreadystatechange = handleInfoRequest;
            xhttp.send();
        }

    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        let data = JSON.parse(this.responseText);
        set_banner(banner, data.message, 'error');
    } else if (this.readyState === XMLHttpRequest.DONE && ![401, 200].includes(this.status)) {
        set_banner(banner, 'ERROR: An unknown error occurred.', 'error')
    }

    button_login.disabled = false;
    button_login.textContent = "Log in";
}

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
       xhttp.open('POST', '/api/account/login/');
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

    window.location.href = `/account/signup/?${urlF}`;
});

if (localStorage.getItem('cvd_token') !== '') {
    button_login.disabled = true;
    button_login.textContent = "Working...";

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/account/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
}
