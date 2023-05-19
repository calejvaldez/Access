# cvaldez/access/views.py
# Carlos Valdez
#
# The views for the Access authentication system

from flask import render_template, Blueprint

bp = Blueprint('access', __name__,
               template_folder='templates',
               static_folder='static',
               url_prefix='/access/')


@bp.route('/')
def index():
    # The promo page
    return "This page is still in the works. :)\nTry <a href=/access/login/>logging in</a>."


@bp.route("/settings/")
def settings():
    return render_template('settings.html')


@bp.route("/login/")
def login():
    return render_template('login.html')


@bp.route("/login-otp/")
def otp():
    return render_template('otp.html')


@bp.route("/signup/")
def signup():
    return render_template('signup.html')


@bp.route("/settings-username/")
def edit_username():
    return render_template('edit_username.html')


@bp.route("/settings-password/")
def edit_password():
    return render_template('edit_password.html')