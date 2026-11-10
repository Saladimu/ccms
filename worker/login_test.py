import urllib.request, json
url = 'https://script.google.com/macros/s/AKfycbxl2Eo8Zn8v0JFRVJhoVJ6Cf_rq7tsFU83fyjYWH7Xw7hq9khscbdhpB57nQaNm_YqIMQ/exec'
data = json.dumps({'action': 'auth.login', 'payload': {'username': 'admin', 'password': 'Admin123!'}}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
print(urllib.request.urlopen(req, timeout=30).read().decode())
