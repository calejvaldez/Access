let banner = document.getElementById('banner');
let button_save_username = document.getElementById('button-edit-username');
let input_new_username = document.getElementById('text-new-username');
let text_current_username = document.getElementById('text-current-username');

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

input_new_username.addEventListener('input', () => {
    button_save_username.disabled = !isValidUsername(input_new_username.value)
});

function handleUsernameRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        location.reload();
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        let data = JSON.parse(this.responseText);

        set_banner(banner, data.message, 'error');
    }

    button_save_username.disabled = false;
    button_save_username.textContent = "Save";
}

button_save_username.addEventListener('click', () => {
    while (banner.lastChild) {
        banner.lastChild.remove();
    }

    if (input_new_username.value === '') {
        set_banner(banner, 'ERROR: Username cannot be empty!', 'error');
    } else {
        button_save_username.disabled = true;
        button_save_username.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/api/access/update/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
        xhttp.onreadystatechange = handleUsernameRequest;

        xhttp.send(JSON.stringify({
            "username": input_new_username.value
        }));
    }
});

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

        text_current_username.textContent = `Current username: ${data.username}`;
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        window.location.href = `/access/login/?forward=0`
    }
}

if (localStorage.getItem('cvd_token') !== '') {
    if (localStorage.getItem('usernameAndJoinDate') !== null) {
        let uAJD = JSON.parse(localStorage.getItem('usernameAndJoinDate'));

        text_current_username.textContent = `Current username: ${uAJD.username}`;
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token'));
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}

set_banner(banner, 'Usernames requirements: 3-20 characters, all lowercase, no whitespace, and no special characters.', 'warning')