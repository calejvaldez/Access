let banner = document.getElementById('banner');
let input_username = document.getElementById('input-username');
let input_password = document.getElementById('input-password');
let button_signup = document.getElementById('button-signup');

let apps = [{name: "Access", url: "/access/settings/"},
    {name: "Our Summer", url: "/our-summer/"}];

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

function isValidUsername(u) {
    if (!(2 < u.length && u.length <= 20)) {
        return false
    } else if (/[~`!#$%\^&*+=\-\[\]\\';,./{}|\\":\s<>\?]/g.test(u)) {
        return false
    } else if (/[A-Z]/.test(u)) {
        return false
    }

    return true
}

function isValidPassword(p) {
    if (p.length < 10) {
        return false
    } else if (!/[A-Z]/.test(p)) {
        return false
    } else if (!/[a-z]/.test(p)) {
        return false
    } else if (!/[0-9]/.test(p)) {
        return false
    } else if (!/[~`!#$%\^&*+=\-\[\]\\';,_./{}|\\":\s<>\?]/g.test(p)) {
        return false
    }

    return true
}

function handleInfoRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        localStorage.setItem('usernameAndJoinDate', JSON.stringify({username: data.username, joined: data.joined}))

        window.location.href = apps.at(getRedirect()).url;
    } else if (this.readyState === XMLHttpRequest.DONE) {
        button_signup.disabled = false;
        button_signup.textContent = "Sign up";
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
        // data.token, data.totp_required, data.message as per API
        let data = JSON.parse(this.responseText);

        if (localStorage.getItem('cvd_token') !== '') {
            localStorage.removeItem('cvd_token');
        }
        localStorage.setItem('cvd_token', data.token);

        window.location.href = `/access/settings/`;

    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 400) {
        let data = JSON.parse(this.responseText);
        set_banner(banner, data.message, 'error');

        button_signup.disabled = false;
        button_signup.textContent = "Sign up";
    } else if (this.readyState === XMLHttpRequest.DONE) {
        set_banner(banner, "An unknown error occurred.", 'error')

        button_signup.disabled = false;
        button_signup.textContent = "Sign up";
    }
}

button_signup.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

   if (input_username.value === '' || input_password.value === '') {
       set_banner('ERROR: Please fill out username and password.', 'error');
   } else {
       button_signup.disabled = true;
       button_signup.textContent = "Working...";

       let xhttp = new XMLHttpRequest();
       xhttp.open('POST', '/api/access/login/');
       xhttp.onreadystatechange = handleRequest;

       xhttp.send(JSON.stringify({
           "username": input_username.value,
           "password": input_password.value,
           "setup": true
       }));
   }
});

input_username.addEventListener('input', () => {
    button_signup.disabled = !isValidUsername(input_username.value);
});

input_password.addEventListener('input', () => {
    button_signup.disabled = !isValidPassword(input_password.value);
})

if (localStorage.getItem('cvd_token') !== '') {
    button_signup.disabled = true;
    button_signup.textContent = "Working...";

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
}
