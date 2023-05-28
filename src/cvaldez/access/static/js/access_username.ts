let banner_for_username = document.getElementById('banner') as HTMLDivElement;
let button_save_username = document.getElementById('button-edit-username') as HTMLButtonElement;
let input_new_username = document.getElementById('text-new-username') as HTMLInputElement;
let text_current_username = document.getElementById('text-current-username') as HTMLParagraphElement;

function isValidUsername(u: string) {
    if (!(2 < u.length && u.length <= 20)) {
        return false
    } else if (/[~`!#$%\^&*+=\-\[\]\\';,./{}|\\":\s<>\?]/g.test(u)) {
        return false
    } else if (/[A-Z]/.test(u)) {
        return false
    }

    return true
}

input_new_username!.addEventListener('input', () => {
    button_save_username!.disabled = !isValidUsername(input_new_username.value)
});

function handleUsernameRequest() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        location.reload();
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        let data = JSON.parse(this.responseText);

        set_banner_for_username(banner_for_username, data.message, 'error');
    }

    button_save_username.disabled = false;
    button_save_username.textContent = "Save";
}

button_save_username.addEventListener('click', () => {
    while (banner_for_username.lastChild) {
        banner_for_username.lastChild.remove();
    }

    if (input_new_username.value === '') {
        set_banner_for_username(banner_for_username, 'ERROR: Username cannot be empty!', 'error');
    } else {
        button_save_username.disabled = true;
        button_save_username.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/api/access/update/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
        xhttp.onreadystatechange = handleUsernameRequest;

        xhttp.send(JSON.stringify({
            "username": input_new_username.value
        }));
    }
});

function set_banner_for_username(banner: HTMLDivElement, text: string, type: string) {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

function handleInfoRequestUsername() {
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
        let uAJD = JSON.parse(localStorage.getItem('usernameAndJoinDate') as string);

        text_current_username.textContent = `Current username: ${uAJD.username}`;
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = handleInfoRequestUsername;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}

set_banner_for_username(banner_for_username, 'Usernames requirements: 3-20 characters, all lowercase, no whitespace, and no special characters.', 'warning')