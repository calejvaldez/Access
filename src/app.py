from flask import Flask, render_template, request, Response
from .SiteTools.user import User, Token
from .SiteTools.exceptions import UserNotFoundError, InvalidTokenError, DuplicateUsernameError, UsernameRuleError, PasswordRuleError
import os
import json

app = Flask(__name__, static_folder="./static/")

####################################################################################################
# AUTHENTICATION
# cvaldez.dev/account/
@app.route('/account/')
def auth_index():
    return render_template('account.html', host_static=os.getenv('host_static'))

@app.route('/account/login/')
def login():
    return render_template('login.html', host_static=os.getenv('host_static'))

@app.route('/account/login/otp/')
def login_otp():
    return render_template('otp.html', host_static=os.getenv('host_static'))

@app.route('/account/signup/')
def signup():
    return render_template('signup.html', host_static=os.getenv('host_static'))

@app.route('/account/signup/otp/')
def signup_otp():
    return render_template('otp_setup.html', host_static=os.getenv('host_static'))

@app.route('/account/edit-username/')
def edit_username():
    return render_template('access_username.html', host_static=os.getenv('host_static'))

@app.route('/account/edit-password/')
def edit_password():
    return render_template('access_password.html', host_static=os.getenv('host_static'))

####################################################################################################
# AUTHENTICATION API
# cvaldez.dev/api/account/
@app.route('/api/account/info/')
def api_account_info():
    try:
        token = Token(request.headers['Bearer'])
        user = token.owner()

        if user.has_totp() and token.type() != 'T':
            return Response(json.dumps({"message": "ERROR: Token of type P. Type T required."}),
                            status=401)
        return Response(user.json(), status=200)
    except InvalidTokenError:
        return Response(json.dumps({"message": "ERROR: Could not confirm login."}), status=401)


@app.route('/api/account/update/', methods=['POST'])
def api_account_update():
    data = json.loads(request.data)
    try:
        token = Token(request.headers['Bearer'])
        user = token.owner()

        if user.has_totp() and token.type() != 'T':
            return Response({"message": 'ERROR: Token must be of type T if they have a totp.'},
                            status=401)

        if 'username' in data:
            try:
                user.update(username=data['username'])
                return json.dumps({"message": "Successfully updated username!"})
            except DuplicateUsernameError:
                return Response(json.dumps(
                    {"message": "ERROR: Username already exists. Please try another."}
                ), status=401)
            except UsernameRuleError:
                return Response(json.dumps({
                    "message": "ERROR: Username violated Username Rules."
                }, status=401))
        elif 'password' in data:
            try:
                user.update(password=data['password'])
                return json.dumps({"message": "Successfully updated password!"})
            except PasswordRuleError:
                return Response({"message": "ERROR: Password violated Password Rules."}, status=401)
        else:
            return json.dumps({"message": "ERROR: Only usernames and passwords can be updated."})


    except InvalidTokenError:
        return json.dumps({"message": "ERROR: Could not confirm login."})

@app.route('/api/account/login/', methods=['POST'])
def api_account_login():
    data = json.loads(request.data)

    if data['setup']:
        try:
            user = User.create(data['username'], data['password'])

            return Response(json.dumps({
                "token": str(user.generate_token('P')),
                "totp_required": False,
                "message": None
            }), status=200)
        except DuplicateUsernameError:
            return Response(json.dumps({
                "token": None,
                "totp_required": False,
                "message": "ERROR: Username already exists, please try another.",
            }), status=400)

        except UsernameRuleError:
            return Response(json.dumps({
                "token": None,
                "totp_required": False,
                "message": "ERROR: Username failed Username Rules."
            }), status=400)
        except PasswordRuleError:
            return Response({
                "token": None,
                "totp_required": False,
                "message": "ERROR: Password violated Password Rules."
            }, status = 401)
    else:
        try:
            user = User(data['username'])

            if user.check_password(data['password']):
                return json.dumps({
                    "token": str(user.generate_token('P')),
                    "totp_required": user.has_totp(),
                    "message": None
                }, indent=2)
            else:
                return Response(json.dumps({
                    "token": None,
                    "totp_required": False,
                    "message": "ERROR: Password is incorrect. Please try again."
                }), status = 401)
        except UserNotFoundError:
            return Response(json.dumps({
                "message": "ERROR: Username not found."
            }), status=401)


@app.route('/api/account/totp/', methods=['GET', 'POST'])
def api_account_totp():
    # token hidden under base64 'username:token'
    try:
        token = Token(request.headers['Bearer'])
    except InvalidTokenError:
        return Response(json.dumps(
            {"message": "ERROR: Could not verify login."}
        ), status=401)
    user = token.owner()

    if request.method == "GET":
        # generate a new totp
        if user.has_totp() and token.type() != 'T':
            return Response({"message": 'ERROR: Token must be of type T if they have a totp.'},
                            status = 401)

        return json.dumps({"setup_code": user.generate_2fa_base32()})
    elif request.method == "POST":
        # verify a totp
        data = json.loads(request.data)
        if data['setup']:
            success = user.save_2fa(data['code'])
            return json.dumps(
                {"success": success,
                 "token": None if not success else str(user.generate_token('T'))}
            )
        else:
            success = user.check_totp(data['code'])
            return json.dumps(
                {"success": success,
                 "token": None if not success else str(user.generate_token('T'))}
            )
