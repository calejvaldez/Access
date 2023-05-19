let banner = document.getElementById('banner');
let button_save_username = document.getElementById('button-edit-password');
let input_new_password = document.getElementById('input-new-password');

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

input_new_password.addEventListener('input', () => {
    button_save_username.disabled = !isValidPassword(input_new_password.value);
});

function handlePasswordRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        if (!data.message.toString().includes('ERROR')) {
            set_banner(banner, data.message, 'success');
        } else {
            set_banner(banner, 'An unknown error occurred. Please try again later.', 'error');
        }
    }

    button_save_username.disabled = false;
    button_save_username.textContent = "Save";
}

button_save_username.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

    if (input_new_password.value === '') {
        set_banner(banner, 'ERROR: Password cannot be empty!', 'error');
    } else {
        button_save_username.disabled = true;
        button_save_username.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/api/access/update/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
        xhttp.onreadystatechange = handlePasswordRequest;

        xhttp.send(JSON.stringify({
            "password": input_new_password.value
        }));
    }
})

function set_banner(banner, text, type) {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

function handleInfoRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        localStorage.setItem('usernameAndJoinDate', JSON.stringify({username: data.username, joined: data.joined}));
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        window.location.href = `/access/login/?forward=0`
    }
}

if (localStorage.getItem('cvd_token') !== '') {
    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}

set_banner(banner, 'Password requirements: 10 characters minimum, 1 uppercase letter, 1 lowercase letter, 1 special character, 1 number, and no whitespace, ', 'warning')