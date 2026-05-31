"""Config encryption -- Fernet symmetric encryption for api_key.
Falls back to plaintext if cryptography package is not installed."""
import logging
import os
from .config import settings

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet
    _HAS_CRYPTO = True
except ImportError:
    _HAS_CRYPTO = False
    import logging
    logging.getLogger(__name__).warning(
        "cryptography package not installed - API key will be stored in plaintext"
    )


def _key_path():
    return settings.data_dir / ".key"


def _get_fernet():
    if not _HAS_CRYPTO:
        return None
    path = _key_path()
    if path.exists():
        key = path.read_bytes()
        _check_key_permissions(path)
    else:
        key = Fernet.generate_key()
        path.write_bytes(key)
        _check_key_permissions(path)
    return Fernet(key)


def _check_key_permissions(path):
    if os.name == "posix":
        try:
            mode = path.stat().st_mode & 0o777
            if mode != 0o600:
                path.chmod(0o600)
                logger.info("Fixed .key file permissions to 600")
        except OSError:
            logger.warning("Could not check .key file permissions")


def encrypt_api_key(config: dict) -> dict:
    if not _HAS_CRYPTO or not config.get("api_key"):
        return config
    data = {"api_key": config["api_key"]}
    for k in list(config.keys()):
        if k != "api_key":
            data[k] = config[k]
    f = _get_fernet()
    data["api_key"] = f.encrypt(config["api_key"].encode()).decode()
    data["_encrypted"] = True
    return data


def decrypt_config(config: dict) -> dict:
    if not _HAS_CRYPTO or not config.get("_encrypted") or not config.get("api_key"):
        return config
    f = _get_fernet()
    try:
        config["api_key"] = f.decrypt(config["api_key"].encode()).decode()
        config.pop("_encrypted", None)
    except Exception as e:
        logger.warning("Failed to decrypt API key, resetting: %s", e)
        config["api_key"] = ""
        config.pop("_encrypted", None)
    return config
