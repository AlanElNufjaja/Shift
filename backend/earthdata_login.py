"""Local, interactive AppEEARS login. No credentials are placed in React or ZIP.

Run from the field-shift folder: py backend\\earthdata_login.py
The password is only held in memory during the HTTPS login request.
"""
from __future__ import annotations
import getpass
import json
from pathlib import Path
import sys
import httpx

API = "https://appeears.earthdatacloud.nasa.gov/api/login"
PRIVATE = Path(__file__).resolve().parent / ".private"


def main():
    print("NASA AppEEARS · local token setup (not for a public server)")
    username = input("NASA Earthdata username: ").strip()
    password = getpass.getpass("NASA Earthdata password (hidden): ")
    if not username or not password:
        print("Both fields are required.")
        return 1
    try:
        with httpx.Client(timeout=25, follow_redirects=False) as client:
            reply = client.post(API, auth=(username,password), data={"grant_type":"client_credentials"})
            reply.raise_for_status()
            payload = reply.json()
        token = payload.get("token")
        if not isinstance(token, str) or not token:
            raise ValueError("AppEEARS did not return a token")
        PRIVATE.mkdir(mode=0o700, parents=True, exist_ok=True)
        dest = PRIVATE / "appeears_token.json"
        dest.write_text(json.dumps({"token":token,"expiration":payload.get("expiration", "")}), encoding="utf-8")
        try:
            dest.chmod(0o600)
        except OSError:
            pass
        print("AppEEARS token saved locally. Password not saved. Never commit backend/.private/.")
        print("Start the backend with backend\\start-local.cmd")
        return 0
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        print("Earthdata login failed. Check the account, network, and AppEEARS availability.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
