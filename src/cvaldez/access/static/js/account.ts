let banner_for_account = document.getElementById('banner') as HTMLDivElement;
let button_edit_username = document.getElementById('button-edit-username') as HTMLButtonElement;
let button_edit_password = document.getElementById('button-edit-password') as HTMLButtonElement;

let hello_user = document.getElementById('hello-user') as HTMLHeadingElement;
let join_date = document.getElementById('joined-date') as HTMLParagraphElement;


function getStringDate(ts: string) {
    let utcSeconds = parseFloat(ts);
    let d = new Date(0);
    d.setUTCSeconds(utcSeconds);


    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December']


    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

function set_banner_account(banner: HTMLDivElement, text: string, type: string) {
    let text_p = document.createElement('p');

    banner.className = `cvdev-banner-${type}`;
    text_p.className = 'cvdev-text-desc';

    text_p.textContent = text;
    banner.appendChild(text_p);
}

button_edit_username.addEventListener('click', () => {
    window.location.href = "/access/settings-username/"
});

button_edit_password.addEventListener('click', () => {
    window.location.href = "/access/settings-password/"
})

function handleInfoRequestAccount() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
        let data = JSON.parse(this.responseText);

        localStorage.setItem('usernameAndJoinDate', JSON.stringify({username: data.username, joined: data.joined}));

        hello_user.textContent = `Hello, ${data.username}!`
        join_date.textContent = `Joined: ${getStringDate(data.joined)}`
    } else if (this.readyState === XMLHttpRequest.DONE && this.status === 401) {
        window.location.href = `/access/login/?forward=0`
    }
}

if (localStorage.getItem('cvd_token') !== '') {
    if (localStorage.getItem('usernameAndJoinDate') !== null) {
        let uAJD = JSON.parse(localStorage.getItem('usernameAndJoinDate') as string);

        hello_user.textContent = `Hello, ${uAJD.username}!`;
        join_date.textContent = `Joined: ${getStringDate(uAJD.joined)}`
    }

    let xhttp = new XMLHttpRequest();
    xhttp.open('GET', '/api/access/info/');
    xhttp.setRequestHeader('Bearer', localStorage.getItem('cvd_token') as string);
    xhttp.onreadystatechange = handleInfoRequest;
    xhttp.send();
} else {
    window.location.href = `/access/login/?forward=0`
}