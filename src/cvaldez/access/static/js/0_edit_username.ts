let eusername_banner = document.getElementById('banner') as HTMLDivElement;
let eusername_button_save_username = document.getElementById('button-edit-username') as HTMLButtonElement;
let eusername_input_new_username = document.getElementById('text-new-username') as HTMLInputElement;
let eusername_text_current_username = document.getElementById('text-current-username') as HTMLParagraphElement;

function isValidUsername(u: string): boolean {
    if (!(2 < u.length && u.length <= 20)) {
        return false
    } else if (/[~`!#$%\^&*+=\-\[\]\\';,./{}|\\":\s<>\?]/g.test(u)) {
        return false
    } else if (/[A-Z]/.test(u)) {
        return false
    }

    return true
}

eusername_input_new_username.addEventListener('input', () => {
    eusername_button_save_username.disabled = !isValidUsername(eusername_input_new_username.value)
});

function handleUsernameRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        location.reload();
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        let data = JSON.parse(this.responseText);

        set_banner(eusername_banner, data.message, 'error');
    }

    eusername_button_save_username.disabled = false;
    eusername_button_save_username.textContent = "Save";
}

eusername_button_save_username.addEventListener('click', () => {
    while (eusername_banner.lastChild) {
        eusername_banner.lastChild.remove();
    }

    if (eusername_input_new_username.value === '') {
        set_banner(eusername_banner, 'ERROR: Username cannot be empty!', 'error');
    } else {
        eusername_button_save_username.disabled = true;
        eusername_button_save_username.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/api/access/update/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
        xhttp.onreadystatechange = handleUsernameRequest;

        xhttp.send(JSON.stringify({
            "username": eusername_input_new_username.value
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

        localStorage.setItem('cvd_identity', JSON.stringify(data));

        eusername_text_current_username.textContent = `Current username: ${data.username}`;
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        window.location.href = `/access/login/?forward=0`
    }
}

if (localStorage.getItem('cvd_token') !== '') {
    if (localStorage.getItem('cvd_identity') !== null) {
        let identity = JSON.parse(localStorage.getItem('cvd_identity') as string);

        eusername_text_current_username.textContent = `Current username: ${identity.username}`;
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/verify-login/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}

set_banner(eusername_banner, 'Usernames requirements: 3-20 characters, all lowercase, no whitespace, and no special characters.', 'warning')