#!/usr/bin/env python3
"""Give the app a new version number before deploying.
Updates the ?v= on app.js/app.css/gate.js, the service worker cache name, and version.json
(which open copies of the app check to know they're out of date)."""
import json, re, time, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
v = str(int(time.time()))[-7:]
for name in ["index.html", "sw.js"]:
    p = root / name
    s = p.read_text()
    s = re.sub(r"bt-shell-\w+", "bt-shell-" + v, s)
    s = re.sub(r"\?v=\w+", "?v=" + v, s)
    p.write_text(s)
(root / "version.json").write_text(json.dumps({"v": v}) + "\n")
print(v)
