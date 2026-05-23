import hashlib

from rest_framework.throttling import SimpleRateThrottle


def make_hash(value):
    value = str(value or '').strip().lower()
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


class BaseIPThrottle(SimpleRateThrottle):
    """
    Ограничение по IP-адресу.
    """

    scope = None

    def get_cache_key(self, request, view):
        ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


class BaseFieldThrottle(SimpleRateThrottle):
    """
    Ограничение по конкретному полю запроса.
    Например: username, email, invite_code.
    """

    scope = None
    field_name = None

    def get_cache_key(self, request, view):
        value = request.data.get(self.field_name)

        if not value:
            return None

        ident = make_hash(value)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


class BaseUserThrottle(SimpleRateThrottle):
    """
    Ограничение по пользователю.
    Если пользователь не авторизован — по IP.
    """

    scope = None

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f'user_{request.user.id}'
        else:
            ident = self.get_ident(request)

        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }


# =========================
# Login
# =========================

class LoginIPThrottle(BaseIPThrottle):
    scope = 'login_ip'


class LoginUsernameThrottle(BaseFieldThrottle):
    scope = 'login_username'
    field_name = 'username'


# =========================
# Register
# =========================

class RegisterIPThrottle(BaseIPThrottle):
    scope = 'register_ip'


# =========================
# Password reset request
# =========================

class PasswordResetRequestIPThrottle(BaseIPThrottle):
    scope = 'password_reset_request_ip'


class PasswordResetRequestEmailThrottle(BaseFieldThrottle):
    scope = 'password_reset_request_email'
    field_name = 'email'


# =========================
# Password reset verify
# =========================

class PasswordResetVerifyIPThrottle(BaseIPThrottle):
    scope = 'password_reset_verify_ip'


class PasswordResetVerifyEmailThrottle(BaseFieldThrottle):
    scope = 'password_reset_verify_email'
    field_name = 'email'


# =========================
# Password reset confirm
# =========================

class PasswordResetConfirmIPThrottle(BaseIPThrottle):
    scope = 'password_reset_confirm_ip'


class PasswordResetConfirmEmailThrottle(BaseFieldThrottle):
    scope = 'password_reset_confirm_email'
    field_name = 'email'


# =========================
# Family join
# =========================

class FamilyJoinUserThrottle(BaseUserThrottle):
    scope = 'family_join_user'


class FamilyJoinCodeThrottle(BaseFieldThrottle):
    scope = 'family_join_code'
    field_name = 'invite_code'