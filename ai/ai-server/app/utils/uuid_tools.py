# app/utils/uuid_tools.py
from uuid import UUID

def to_uuid_bytes(u) -> bytes:
    """str/UUID/bytes -> always BINARY(16) bytes"""
    if isinstance(u, (bytes, bytearray)):
        return bytes(u)
    if isinstance(u, UUID):
        return u.bytes
    return UUID(str(u)).bytes

def to_uuid_str(v) -> str:
    """bytes/UUID/str -> always canonical UUID string"""
    if isinstance(v, (bytes, bytearray)):
        return str(UUID(bytes=v))
    if isinstance(v, UUID):
        return str(v)
    # if it's already str (maybe), normalize to canonical
    return str(UUID(str(v)))
