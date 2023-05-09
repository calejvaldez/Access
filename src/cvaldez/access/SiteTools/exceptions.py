class UserNotFoundError(Exception):
    ...

class KeyTypeError(Exception):
    ...

class DuplicateUsernameError(Exception):
    ...

class InvalidTokenError(Exception):
    ...

class UsernameRuleError(Exception):
    """
    Username rules:
    - Length must be between 3-20 characters
    - No special characters
    - No uppercase letters
    """
    ...

class PasswordRuleError(Exception):
    """
    Password rules:
    - Length must be greater than 14 characters
    - must include uppercase
    - must include lowercase
    - must include numbers
    - Must include a special character
    """
    ...