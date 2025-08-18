from urllib.parse import urlparse
import re

def to_files_relative(url: str | None) -> str | None:
    if not url:
        return None
    u = url.strip()
    p = urlparse(u)
    path = p.path if (p.scheme and p.netloc) else u
    path = "/" + path.lstrip("/")
    path = re.sub(r"/{2,}", "/", path)
    for marker in ("/files/", "/files-dev/"):
        i = path.find(marker)
        if i != -1:
            return path[i:]
    return path