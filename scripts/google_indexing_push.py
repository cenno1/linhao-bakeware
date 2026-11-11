import os
import sys
import json
import time
import base64
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

# ==============================================================================
# Google Indexing API Push Tool (For Instant Google Bot Ingestion)
# ==============================================================================
# Uses Google Service Account JSON to send URL_UPDATED notifications directly to Google.

SCOPES = ["https://www.googleapis.com/auth/indexing"]
INDEXING_ENDPOINT = "https://indexing.googleapis.com/v3/urlNotifications:publish"

def base64url_encode(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def get_google_access_token(service_account_path):
    """
    Exchanges Service Account credentials for an OAuth2 Bearer token
    using PyJWT or standard cryptography if available, or requests token directly.
    """
    if not os.path.exists(service_account_path):
        print(f"[Google Indexing] Service account file not found: {service_account_path}")
        print("Please place your Google Cloud Service Account JSON file in the scripts/ folder as 'service_account.json'.")
        return None

    with open(service_account_path, 'r', encoding='utf-8') as f:
        sa = json.load(f)

    # Let's try importing cryptography/jwt
    try:
        import jwt
        now = int(time.time())
        payload = {
            "iss": sa["client_email"],
            "scope": "https://www.googleapis.com/auth/indexing",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": now + 3600,
            "iat": now
        }
        signed_jwt = jwt.encode(payload, sa["private_key"], algorithm="RS256")
    except ImportError:
        # Fallback to python oauth2 or instructions
        print("[Google Indexing] PyJWT/cryptography not installed. Running: pip install pyjwt cryptography...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "pyjwt", "cryptography"], capture_output=True)
        import jwt
        now = int(time.time())
        payload = {
            "iss": sa["client_email"],
            "scope": "https://www.googleapis.com/auth/indexing",
            "aud": "https://oauth2.googleapis.com/token",
            "exp": now + 3600,
            "iat": now
        }
        signed_jwt = jwt.encode(payload, sa["private_key"], algorithm="RS256")

    # Exchange JWT for Bearer token
    req_data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed_jwt
    }).encode('utf-8')

    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=req_data, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data.get("access_token")
    except Exception as e:
        print(f"[Google Indexing] Failed to acquire access token: {e}")
        return None

def publish_url_to_google(access_token, url, action="URL_UPDATED"):
    payload = {
        "url": url,
        "type": action
    }
    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        INDEXING_ENDPOINT,
        data=req_data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            print(f" [Google Indexing API] Successfully notified: {url} -> {res.get('urlNotificationMetadata', {}).get('latestUpdate', {}).get('type', 'OK')}")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8')
        print(f" [Google Indexing API] Failed for {url}: {err_msg}")
        return False

def push_all_sitemap_urls(service_account_path="service_account.json"):
    token = get_google_access_token(service_account_path)
    if not token:
        return

    sitemap_path = os.path.join(os.path.dirname(__file__), "..", "sitemap.xml")
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = [loc.text.strip() for loc in root.findall('.//ns:loc', namespace) if loc.text]

    print(f"Pushing {len(urls)} URLs to Google Indexing API...")
    for u in urls:
        publish_url_to_google(token, u)
        time.sleep(0.2) # Rate limit courtesy

if __name__ == "__main__":
    sa_file = os.path.join(os.path.dirname(__file__), "service_account.json")
    push_all_sitemap_urls(sa_file)
