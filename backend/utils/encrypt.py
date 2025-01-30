import os

from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

cipher = Fernet(os.getenv("ENCRYPTION_KEY").encode())


def encrypt_str(string: str) -> str:
    return cipher.encrypt(string.encode("utf-8")).decode("utf-8")


def decrypt_str(encrypted_string: str) -> str:
    return cipher.decrypt(encrypted_string.encode("utf-8")).decode("utf-8")
