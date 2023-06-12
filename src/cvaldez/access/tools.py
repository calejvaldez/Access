from collections import namedtuple
from cryptography.fernet import Fernet
import psycopg2
import os
import json
import pyotp
import uuid
import time
import random
import string

RawToken = namedtuple('RawToken', ['id', 'token', 'timestamp', 'type'])
RawIdentity = namedtuple('RawIdentity', ['id', 'joined', 'type', 'username'])
RawAccessProject = namedtuple('RawAccessProject', ['id', 'name', 'url'])

DB_LINK = os.getenv("DB_LINK")
TOKEN_ENCRYPTION_KEY = os.getenv("TOKEN_ENCRYPTION_KEY")
TOTP_ENCRYPTION_KEY = os.getenv("TOTP_ENCRYPTION_KEY")
PW_ENCRYPTION_KEY = os.getenv("PW_ENCRYPTION_KEY")


class UserNotFoundError(Exception):
    ...


class Identity:
    def __init__(self, identity_id=None, username=None):
        assert identity_id or username, "Identity.__init__: identity_id or username is required."

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute('SELECT uuid, joined, type, username FROM users WHERE uuid=%s', (identity_id,)) if \
                identity_id else cur.execute('SELECT uuid, joined, type, username FROM users WHERE username=%s',
                                             (username,))

            d = cur.fetchall()

            if len(d) == 0:
                raise UserNotFoundError
            
            d = RawIdentity(*d[0])

            self._data = {
                'id': d.id,
                'joined': d.joined,
                'type': d.type,
                'username': d.username
            }

    def id(self):
        return self._data['id']

    def username(self):
        return self._data['username']

    def joined(self):
        return self._data['joined']

    def type(self):
        return self._data['type']

    def has_totp(self) -> bool:
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()

            cur.execute("SELECT * FROM mfa WHERE uuid=%s AND type='SAVED'", (self.id(),))

            return bool(len(cur.fetchall()))

    def editor(self, password: str) -> 'IdentityEditor':
        return IdentityEditor(username=self.username(), password=password)

    @staticmethod
    def exists(username: str):
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("SELECT username FROM users WHERE username=%s", (username,))

            return True if len(cur.fetchall()) > 0 else False

    def json(self) -> str:
        return json.dumps({
            "id": self.id(),
            "joined": self.joined(),
            "type": self.type(),
            "username": self.username(),
            "has_totp": self.has_totp()
        }, indent=2)


def get_identity_with_token(token: str) -> Identity | None:
    if not token:
        return None

    d = None
    f = Fernet(TOKEN_ENCRYPTION_KEY.encode('utf-8'))

    with psycopg2.connect(DB_LINK) as con:
        cur = con.cursor()
        cur.execute("SELECT uuid, token FROM tokens")

        for dt in cur.fetchall():
            if token == f.decrypt(dt[1].encode('utf-8')).decode('utf-8'):
                d = dt
                break

        if not d:
            return None

        if token != f.decrypt(d[1].encode('utf-8')).decode('utf-8'):
            return None

    return Identity(d[0])


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


class DuplicateUsernameError(Exception):
    ...


class UsernameRuleError(Exception):
    ...


class PasswordRuleError(Exception):
    ...


class TokenNotAllowed(Exception):
    ...


class IdentityEditor(Identity):
    def __init__(self, token: str = None, username: str = None, password: str = None):
        if token:
            t = Token(token)
            i = t.owner()

            super().__init__(identity_id=i.id())

            self._data = {
                'id': self._data['id'],
                'joined': self._data['joined'],
                'type': self._data['type'],
                'username': self._data['username']
            }
        elif username and password:
            super().__init__(username=username)

            if self.check_password(password):
                self._data = {
                    'id': self._data['id'],
                    'joined': self._data['joined'],
                    'type': self._data['type'],
                    'username': self._data['username']
                }
            else:
                raise KeyError('IdentityEditor.__init__: Password is incorrect.')
        else:
            raise UserNotFoundError

    def id(self) -> str:
        return self._data['id']

    def type(self) -> str:
        return self._data['type']

    def joined(self) -> str:
        return self._data['joined']

    def username(self) -> str:
        return self._data['username']

    def check_password(self, password: str) -> bool:
        f = Fernet(PW_ENCRYPTION_KEY.encode('utf-8'))

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM users WHERE uuid=%s", (self.id(),))
            psql = cur.fetchone()[4]

        return password == f.decrypt(psql.encode('utf-8')).decode('utf-8')

    def check_totp(self, code: str) -> bool:
        f = Fernet(TOTP_ENCRYPTION_KEY.encode('utf-8'))
        assert type(code) in (str, int), f'User.check_totp: code must be str or int, not {type(code)}.'
        code = code if type(code) is str else str(code)

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute(f"SELECT * FROM mfa WHERE uuid=%s AND type='SAVED'", (self.id(),))
            tsql = cur.fetchone()[1]

            if not tsql:
                return False

        return pyotp.TOTP(f.decrypt(tsql.encode('utf-8')).decode('utf-8')).verify(code)

    def generate_token(self, type_of_token: str) -> 'Token':
        if type_of_token == 'T' and not self.has_totp():
            raise TokenNotAllowed('IdentityEditor.generate_token: User requires TOTP to have type T token.')
        return Token.generate(self.id(), type_of_token)

    @staticmethod
    def create(username: str, password: str) -> 'IdentityEditor':
        f = Fernet(PW_ENCRYPTION_KEY.encode('utf-8'))

        _uuid = str(uuid.uuid4())
        _joined = time.time()
        _type = "USER"
        _username = _clean_username(username)

        _password = f.encrypt(password.encode('utf-8')).decode('utf-8')
        _check_password(_password)

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()

            cur.execute("SELECT * FROM users WHERE username=(%s)", (username,))
            if cur.fetchone():
                raise DuplicateUsernameError('User.create: Cannot create account with duplicate username.')

            cur.execute("INSERT INTO users(uuid, joined, type, username, password) VALUES(%s, %s, %s, %s, %s)", (_uuid, _joined, _type, _username, _password,))
            con.commit()

        token = Token.generate(_uuid, 'P')

        return IdentityEditor(str(token))

    def set_username(self, username: str):
        if not username:
            raise KeyError("You must include a username.")

        if not isinstance(username, str):
            raise TypeError("username must be a string")

        username = _clean_username(username)

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM users WHERE username=%s", (username,))
            if cur.fetchone():
                raise DuplicateUsernameError

            cur.execute("UPDATE users SET username=%s WHERE uuid=%s", (username, self._data['id'],))
            con.commit()
        self._data['username'] = username

    def set_password(self, password: str):
        if not password:
            raise KeyError("You must include a password.")

        if not isinstance(password, str):
            raise TypeError('Password must be string')

        _check_password(password)

        f = Fernet(PW_ENCRYPTION_KEY.encode('utf-8'))
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("UPDATE users SET password=%s WHERE uuid=%s",
                        (f.encrypt(password.encode('utf-8')).decode('utf-8'), self._data['id'],))
            con.commit()

    def delete(self):
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("DELETE FROM users WHERE uuid=%s", (self.id(),))
            cur.execute("DELETE FROM mfa WHERE uuid=%s", (self.id(),))
            cur.execute("DELETE FROM tokens WHERE uuid=%s", (self.id(),))

            con.commit()


def get_access_dict() -> dict:
    with psycopg2.connect(DB_LINK) as con:
        cur = con.cursor()
        cur.execute("SELECT id, name, forward_url FROM pst_projects")

        d = {}

        for x in cur.fetchall():
            x = RawAccessProject(*x)
            d.update({x.id: {'name': x.name, 'url': x.url}})

        return d


def get_id_by_token(token: str) -> str | None:
    if token == '' or not isinstance(token, str):
        return None

    with psycopg2.connect(DB_LINK) as con:
        f = Fernet(TOKEN_ENCRYPTION_KEY.encode('utf-8'))

        cur = con.cursor()
        cur.execute("SELECT uuid, token FROM tokens")

        for t in cur.fetchall():
            if f.decrypt(t[1]).decode('utf-8') == token:
                return t[0]

        return None


class InvalidTokenError(Exception):
    ...


class Token:
    def __init__(self, token: str):
        d = None
        f = Fernet(TOKEN_ENCRYPTION_KEY.encode('utf-8'))

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("SELECT * FROM tokens")

            for dt in cur.fetchall():
                if token == f.decrypt(dt[1].encode('utf-8')).decode('utf-8'):
                    d = dt
                    break

            if not d:
                raise InvalidTokenError('Token.__init__: Token not found.')

            if token != f.decrypt(d[1].encode('utf-8')).decode('utf-8'):
                raise InvalidTokenError('Token.__init__: Token is invalid.')

        self._data = RawToken(d[0], token, d[2], d[3])

    def __str__(self):
        return self._data.token

    def owner(self, editor=False) -> Identity:
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("SELECT uuid FROM users WHERE uuid=%s", (self._data.id,))

            if editor:
                return IdentityEditor(str(self))
            else:
                return Identity(identity_id=cur.fetchone()[0])

    def type(self):
        return self._data.type

    def destroy(self):
        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()
            cur.execute("DELETE FROM tokens WHERE uuid=%s", (self._data.id,))
            con.commit()

    @staticmethod
    def generate(identity_id: str, type_of_token: str) -> 'Token':
        assert identity_id, 'Token.generate: identity_id must have value.'
        assert type_of_token in ('P', 'T', 'D'), 'Token must be of type P, T, or D.'
        t = ''

        while len(t) < 50:
            t += random.choice(string.ascii_letters + string.digits)

        f = Fernet(TOKEN_ENCRYPTION_KEY.encode('utf-8'))

        with psycopg2.connect(DB_LINK) as con:
            cur = con.cursor()

            cur.execute("SELECT token, type FROM tokens WHERE uuid=%s", (identity_id,))

            rows = cur.fetchall()

            if len(rows):
                [Token(f.decrypt(t_in_db[0].encode('utf-8')).decode('utf-8')).destroy() for t_in_db in rows if t_in_db in ('P', 'T')]

            cur.execute("INSERT INTO tokens(uuid, token, timestamp, type) VALUES (%s, %s, %s, %s)", (identity_id, f.encrypt(t.encode('utf-8')).decode('utf-8'), str(time.time()), type_of_token,))
            con.commit()

        return Token(t)
