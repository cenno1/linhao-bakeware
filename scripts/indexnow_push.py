import os
import json
import xml.etree.ElementTree as ET
import urllib.request
import urllib.parse

# ==============================================================================
# IndexNow Push Tool (For Bing, Copilot, ChatGPT Search Engines)
# ==============================================================================
# Generates instant indexing pings without complex OAuth credentials.

INDEXNOW_KEY = "89b7ecf7c5f7422e82f470c5735a3285"
HOST = "linhaobakeware.com"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"

def get_sitemap_urls(sitemap_path):
    urls = []
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        for loc in root.findall('.//ns:loc', namespace):
            if loc.text:
                urls.append(loc.text.strip())
    except Exception as e:
        print(f"Error reading sitemap: {e}")
    return urls

def push_to_indexnow(urls):
    if not urls:
        print("No URLs found to submit.")
        return

    endpoint = "https://api.indexnow.org/indexnow"
    payload = {
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            print(f"[IndexNow] Successfully submitted {len(urls)} URLs to Bing/Search Engines! HTTP Status: {status}")
    except Exception as e:
        print(f"[IndexNow] Submission note: {e}")

if __name__ == "__main__":
    sitemap_file = os.path.join(os.path.dirname(__file__), "..", "sitemap.xml")
    if os.path.exists(sitemap_file):
        urls = get_sitemap_urls(sitemap_file)
        print(f"Found {len(urls)} URLs in sitemap.xml")
        push_to_indexnow(urls)
    else:
        print("sitemap.xml not found!")
