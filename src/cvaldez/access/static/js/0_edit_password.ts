let epassword_banner = document.getElementById('banner') as HTMLDivElement;
let epassword_button_save_username = document.getElementById('button-edit-password') as HTMLButtonElement;
let epassword_input_new_password = document.getElementById('input-new-password') as HTMLInputElement;

function isValidPassword(p: string): boolean {
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

epassword_input_new_password.addEventListener('input', () => {
    epassword_button_save_username.disabled = !isValidPassword(epassword_input_new_password.value);
});

function handleRequest_Password() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        if (!data.message.toString().includes('ERROR')) {
            set_banner(epassword_banner, data.message, 'success');
        } else {
            set_banner(epassword_banner, 'An unknown error occurred. Please try again later.', 'error');
        }
    }

    epassword_button_save_username.disabled = false;
    epassword_button_save_username.textContent = "Save";
}

epassword_button_save_username.addEventListener('click', () => {
    while (epassword_banner.lastChild) {
        epassword_banner.lastChild.remove();
    }

    if (epassword_input_new_password.value === '') {
        set_banner(epassword_banner, 'ERROR: Password cannot be empty!', 'error');
    } else {
        epassword_button_save_username.disabled = true;
        epassword_button_save_username.textContent = "Working...";

        let xhttp = new XMLHttpRequest();
        xhttp.open('POST', '/api/access/update/');
        xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
        xhttp.onreadystatechange = handleRequest_Password;

        xhttp.send(JSON.stringify({
            "password": epassword_input_new_password.value
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

function epassword_handleRequest_Info() {
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
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = epassword_handleRequest_Info;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}

set_banner(epassword_banner, 'Password requirements: 10 characters minimum, 1 uppercase letter, 1 lowercase letter, 1 special character, 1 number, and no whitespace.', 'warning')