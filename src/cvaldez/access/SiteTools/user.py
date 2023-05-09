# user.py
# Author: Carlos Valdez
#
# Tools to help make auth.cvaldez.dev and account.cvaldez.dev easier to manage.
import json
import uuid
import os
import time
import pyotp
import random
import string
import psycopg2
from cryptography.fernet import Fernet
from .exceptions import UserNotFoundError, InvalidTokenError, DuplicateUsernameError, UsernameRuleError, PasswordRuleError


def _clean_username(u: str) -> str:
    u = ''.join(u.lower().split())

    if not (2 < len(u) <= 20):
        raise UsernameRuleError("User.create: Username must be between 3-20 characters.")
    elif any(not c.isalnum() and c!='_' for c in u):
        raise UsernameRuleError("User.create: Username cannot include special characters.")
    return u


def _check_password(p: str) -> bool:
    if len(p) < 10:
        raise PasswordRuleError("User.create: Password must be 14 characters or more.")
    elif not any(c.isupper() for c in p):
        raise PasswordRuleError("User.create: Password must include uppercase letters.")
    elif not any(c.islower() for c in p):
        raise PasswordRuleError("User.create: Password must include lowercase letters.")
    elif not any(c.isnumeric() for c in p):
        raise PasswordRuleError("User.create: Password must include numbers.")
    elif not any(not c.isalnum() for c in p):
        raise PasswordRuleError("User.create: Password must include special characters.")

    return True

class User:
    def __init__(self, username: str):
        self._con = psycopg2.connect(os.getenv("DB_LINK"))
        _usql = None

        with psycopg2.connect(os.getenv("DB_LINK")) as con:
            _cur = con.cursor()
            _cur.execute('SELECT * FROM users WHERE username=%s;', (username,))

            _rows = _cur.fetchall()

            if len(_rows) == 1:
                _usql = _rows[0]
            else:
                raise UserNotFoundError()

        self._uuid = _usql[0]
        self._joined = float(_usql[1])
        self._type = _usql[2]
        self._username = _usql[3]

    def username(self) -> str:
        return self._username

    def id(self) -> str:
        return self._uuid

    def joined(self) -> float:
        return self._joined

    def type(self) -> str:
        return self._type

    def generate_2fa_base32(self) -> str:
        generated_totp = pyotp.random_base32()
        f = Fernet(os.getenv("TOTP_ENCRYPTION_KEY").encode('utf-8'))

        with self._con as con:
            cur = con.cursor()

            cur.execute("DELETE FROM mfa WHERE type='SETUP' AND uuid=%s", (self._uuid,))

            cur.execute("INSERT INTO mfa(uuid, seed, timestamp, name, type) VALUES (%s, %s, %s, %s, %s)",
                        (self._uuid, f.encrypt(generated_totp.encode('utf-8')).decode('utf-8'),
                         str(time.time()), 'Authenticator App', 'SETUP',))

            con.commit()
        return generated_totp

    def save_2fa(self, totp: str) -> bool:
        f = Fernet(os.getenv("TOTP_ENCRYPTION_KEY").encode('utf-8'))
        with self._con as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM mfa WHERE uuid=%s AND type='SETUP';", (self._uuid,))
            totp_attempt = cur.fetchone()[1]

            if not totp_attempt:
                raise ValueError('User.save_2fa: User has no attempted TOTP code.')

            if pyotp.TOTP(f.decrypt(totp_attempt.encode('utf-8')).decode('utf-8')).verify(totp):
                cur.execute("UPDATE mfa SET type='SAVED' WHERE uuid=%s", (self._uuid,))
                con.commit()

                return True
            else:
                return False

    def check_password(self, password: str) -> bool:
        f = Fernet(os.getenv('PW_ENCRYPTION_KEY').encode('utf-8'))

        with self._con as con:
            _cur = con.cursor()
            _cur.execute("SELECT * FROM users WHERE uuid=%s", (self._uuid,))
            psql = _cur.fetchone()[4]

        return password == f.decrypt(psql.encode('utf-8')).decode('utf-8')

    def check_totp(self, code: str) -> bool:
        f = Fernet(os.getenv('TOTP_ENCRYPTION_KEY').encode('utf-8'))
        assert type(code) in (str, int), f'User.check_totp: code must be str or int, not {type(code)}.'
        code = code if type(code) is str else str(code)

        with self._con as con:
            _cur = con.cursor()
            _cur.execute(f"SELECT * FROM mfa WHERE uuid=%s AND type='SAVED'", (self._uuid,))
            tsql = _cur.fetchone()[1]

            if not tsql:
                return False

        return pyotp.TOTP(f.decrypt(tsql.encode('utf-8')).decode('utf-8')).verify(code)


    def generate_token(self, type_of_token: str) -> 'Token':
        assert type_of_token in ('P', 'T'), 'Token must be of type P or T.'
        t = ''

        while len(t) < 50:
            t += random.choice(string.ascii_letters + string.digits)

        f = Fernet(os.getenv('TOKEN_ENCRYPTION_KEY').encode('utf-8'))

        with self._con as con:
            cur = con.cursor()

            cur.execute("SELECT token FROM tokens WHERE uuid=%s", (self._uuid,))

            rows = cur.fetchall()

            if len(rows):
                [Token(f.decrypt(t_in_db[0].encode('utf-8')).decode('utf-8')).destroy() for t_in_db in rows]


            cur.execute("INSERT INTO tokens(uuid, token, timestamp, type) VALUES (%s, %s, %s, %s)", (self._uuid, f.encrypt(t.encode('utf-8')).decode('utf-8'), str(time.time()), type_of_token,))
            con.commit()

        return Token(t)

    def has_totp(self) -> bool:
        with self._con as con:
            _cur = con.cursor()
            _cur.execute("SELECT * FROM mfa WHERE uuid=%s AND type='SAVED'", (self._uuid,))
            tsql = _cur.fetchall()

            return bool(len(tsql))

    @staticmethod
    def create(username: str, password: str) -> 'User':
        f = Fernet(os.getenv("PW_ENCRYPTION_KEY").encode('utf-8'))

        _uuid = str(uuid.uuid4())
        _joined = time.time()
        _type = "USER"
        _username = _clean_username(username)

        _password = f.encrypt(password.encode('utf-8')).decode('utf-8')
        _check_password(_password)

        with psycopg2.connect(os.getenv("DB_LINK")) as con:
            cur = con.cursor()

            cur.execute("SELECT * FROM users WHERE username=(%s)", (username,))
            if cur.fetchone():
                raise DuplicateUsernameError('User.create: Cannot create account with duplicate username.')

            cur.execute("INSERT INTO users(uuid, joined, type, username, password) VALUES(%s, %s, %s, %s, %s)", (_uuid, _joined, _type, _username, _password,))
            con.commit()

        return User(_username)

    def json(self) -> str:
        return json.dumps({
            "id": self._uuid,
            "joined": self._joined,
            "type": self._type,
            "username": self._username
        }, indent=2)

    def update(self, *, username=None, password=None):
        if not (username or password):
            raise KeyError('You must include username, password, or both.')

        if username:
            if type(username) is not str:
                raise TypeError('username must be string')

            username = _clean_username(username)

            with self._con as con:
                cur = con.cursor()

                cur.execute("SELECT * FROM users WHERE username=%s", (username,))
                if cur.fetchone():
                    raise DuplicateUsernameError('User.create: Cannot create account with duplicate username.')

                cur.execute("UPDATE users SET username=%s WHERE uuid=%s", (username, self._uuid,))
                con.commit()
            self._username = username

        if password:
            if type(password) is not str:
                raise TypeError('Password must be string')

            _check_password(password)

            f = Fernet(os.getenv("PW_ENCRYPTION_KEY").encode('utf-8'))
            with self._con as con:
                cur = con.cursor()
                cur.execute("UPDATE users SET password=%s WHERE uuid=%s", (f.encrypt(password.encode('utf-8')).decode('utf-8'),self._uuid,))
                con.commit()

class Token:
    def __init__(self, token: str):
        _f = Fernet(os.getenv('TOKEN_ENCRYPTION_KEY').encode('utf-8'))
        _tsql = None

        with psycopg2.connect(os.getenv('DB_LINK')) as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM tokens")

            for dt in cur.fetchall():
                if token == _f.decrypt(dt[1].encode('utf-8')).decode('utf-8'):
                    _tsql = dt
                    break

            if not _tsql:
                raise InvalidTokenError("Token was not found in the database.")

            if token != _f.decrypt(_tsql[1].encode('utf-8')).decode('utf-8'):
                raise InvalidTokenError(f"Token is not valid.")


        self._token = token
        self._type = _tsql[3]
        self._timestamp = float(_tsql[2])
        self._uuid = _tsql[0]

    def __str__(self):
        return self._token

    def owner(self) -> User:
        with psycopg2.connect(os.getenv("DB_LINK")) as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM users WHERE uuid=%s", (self._uuid,))

            return User(cur.fetchone()[3])

    def type(self):
        return self._type

    def destroy(self):
        with psycopg2.connect(os.getenv("DB_LINK")) as con:
            cur = con.cursor()
            cur.execute("DELETE FROM tokens WHERE uuid=%s", (self._uuid,))
            con.commit()