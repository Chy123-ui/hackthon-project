"""Config encryption -- Fernet symmetric encryption for api_key.
Falls back to plaintext if cryptography package is not installed."""
import os
from .config import settings

try:
    from cryptography.fernet import Fernet
    _HAS_CRYPTO = True
except ImportError:
    _HAS_CRYPTO = False


def _key_path():
    return settings.data_dir / ".key"


def _get_fernet():
    if not _HAS_CRYPTO:
        return None
    path = _key_path()
    if path.exists():
        key = path.read_bytes()
    else:
        key = Fernet.generate_key()
        path.write_bytes(key)
    return Fernet(key)


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
    except Exception:
        config["api_key"] = ""
        config.pop("_encrypted", None)
    return config
