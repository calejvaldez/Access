from flask import Blueprint, request, Response
from access import Identity, IdentityEditor, Token
from access import UserNotFoundError, DuplicateUsernameError, UsernameRuleError, PasswordRuleError, InvalidTokenError
import json

bp = Blueprint('access api', __name__,
               template_folder='templates',
               static_folder='static',
               url_prefix='/api/access/')


@bp.route('/account-exists/', methods=['POST'])
def api_check_account():
    data = json.loads(request.data)
    if 'username' in data:
        return Response(json.dumps({"exists": Identity.exists(data['username'])}), status=200)
    else:
        return Response(json.dumps({'exists': False}), status=401)


@bp.route('/verify-login/')
def api_account_info():
    """
    Gets information about the logged-in user.

    :return: Information about the user
    """
    try:
        # Identifies the user through their token
        token = Token(request.headers['Bearer'])
        user = token.owner()

        # If the user has TOTP, make sure they logged in using 2FA
        if user.has_totp() and token.type() != 'T':
            return Response(json.dumps({"message": "ERROR: Token of type P. Type T required."}),
                            status=401)
        return Response(user.json(), status=200)
    except InvalidTokenError:
        return Response(json.dumps({"message": "ERROR: Could not confirm login."}), status=401)


@bp.route('/update/', methods=['POST'])
def api_account_update():
    data = json.loads(request.data)
    try:
        # Identifies the user through their token
        token = Token(request.headers['Bearer'])
        user = token.owner(editor=True)

        # If the user has TOTP, make sure they logged in using 2FA
        if user.has_totp() and token.type() != 'T':
            return Response({"message": 'ERROR: Token must be of type T if they have a totp.'},
                            status=401)

        if 'username' in data:
            try:
                user.set_username(username=data['username'])
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
                user.set_password(password=data['password'])
                return json.dumps({"message": "Successfully updated password!"})
            except PasswordRuleError:
                return Response({"message": "ERROR: Password violated Password Rules."}, status=401)
        else:
            return json.dumps({"message": "ERROR: Only usernames and passwords can be updated."})

    except InvalidTokenError:
        return json.dumps({"message": "ERROR: Could not confirm login."})


@bp.route('/login/', methods=['POST'])
def api_account_login():
    data = json.loads(request.data)

    if data['setup']:
        # This is where account creation happens
        # Ensures the Password and Username rules are followed
        try:
            user = IdentityEditor.create(data['username'], data['password'])

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
            }, status=401)
    else:
        # This is where logging in happens
        try:
            # Verifies password
            user = Identity(username=data['username']).editor(data['password'])
            return json.dumps({
                "token": str(user.generate_token('P')),
                "totp_required": user.has_totp(),
                "message": None
            }, indent=2)

        except UserNotFoundError:
            return Response(json.dumps({
                "message": "ERROR: Username or password is not correct.."
            }), status=401)


@bp.route('/totp/', methods=['POST'])
def api_account_totp():
    try:
        # Verifies the token exists
        token = Token(request.headers['Bearer'])
    except InvalidTokenError:
        return Response(json.dumps(
            {"message": "ERROR: Could not verify login."}
        ), status=401)

    user = token.owner(editor=True)
    data = json.loads(request.data)
    success = user.check_totp(data['code'])

    return json.dumps(
        {"success": success,
         "token": None if not success else str(user.generate_token('T'))}
    )
