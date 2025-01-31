from enum import Enum


class Scopes(str, Enum):
    STUDENT = "0"
    TEACHER = "1"
    ADMIN = "2"
