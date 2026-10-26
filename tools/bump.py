#!/usr/bin/env python3
"""Give the app a new version before deploying.
- ?v= on app.js/app.css/gate.js and the service worker cache name (so phones fetch the new files)
- version.json, which open copies of the app check to know they're out of date
- the <meta name="bt-build"> tag the Profile tab reads to show "Version 1.N · Last update …"
The version number is 1.<number of commits>, counting the commit this deploy is about to make."""
import json, re, time, pathlib, subprocess, datetime
root = pathlib.Path(__file__).resolve().parent.parent
v = str(int(time.time()))[-7:]
count = int(subprocess.run(["git", "rev-list", "--count", "HEAD"], cwd=root, capture_output=True, text=True).stdout.strip() or 0) + 1
name = f"1.{count}"
at = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
for f in ["index.html", "sw.js"]:
    p = root / f
    s = p.read_text()
    s = re.sub(r"bt-shell-\w+", "bt-shell-" + v, s)
    s = re.sub(r"\?v=\w+", "?v=" + v, s)
    if f == "index.html":
        tag = f'<meta name="bt-build" content="{name}" data-at="{at}">'
        s = re.sub(r'<meta name="bt-build"[^>]*>', tag, s) if 'name="bt-build"' in s else s.replace("<title>", tag + "\n<title>", 1)
    p.write_text(s)
(root / "version.json").write_text(json.dumps({"v": v, "name": name, "at": at}) + "\n")
print(name, v, at)
