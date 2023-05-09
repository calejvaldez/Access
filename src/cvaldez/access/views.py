# cvaldez/access/views.py
# Carlos Valdez
#
# The views for the Access authentication system

from flask import render_template, Blueprint

bp = Blueprint('access', __name__,
               template_folder='templates',
               static_folder='static',
               url_prefix='/access/')

@bp.route('/account/')
def auth_index():
    # The main page users go to.
    # If they're not logged in, it shows a promotional page
    return render_template('account.html')


@bp.route('/account/login/')
def login():
    # The page where users can log in.
    # If they're already logged in, goes to /account/
    return render_template('login.html')


@bp.route('/account/login/otp/')
def login_otp():
    # The page where users use an TOTP to log in.
    # If they're already logged in, goes to /account/
    return render_template('otp.html')


@bp.route('/account/signup/')
def signup():
    # The page where users can sign in.
    # If they're already logged in, goes to /account/
    return render_template('signup.html')


@bp.route('/account/signup/otp/')
def signup_otp():
    # The page where users can enable OTP.
    # If they're already logged in, goes to /account/
    return render_template('otp_setup.html')


@bp.route('/account/edit-username/')
def edit_username():
    # The page where users can edit their username
    return render_template('access_username.html')


@bp.route('/account/edit-password/')
def edit_password():
    # The page where users can edit their passwords
    return render_template('access_password.html')
