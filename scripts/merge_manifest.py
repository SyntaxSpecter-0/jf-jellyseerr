#!/usr/bin/env python3
"""Builds mods.json = upstream JellyFrame catalog + this repo's mod-entry.json.

JellyFrame only resolves enabled mods against the single manifest last loaded,
so pointing the marketplace at a one-mod manifest silently disables every
other mod. This keeps our URL while still serving the full catalog.
Our entry wins if an upstream mod has the same id.
"""
import json
import sys
import urllib.request

UPSTREAM = "https://raw.githubusercontent.com/Jellyfin-PG/JellyFrame-Resources/main/mods.json"

def main():
    with open("mod-entry.json", encoding="utf8") as f:
        ours = json.load(f)

    try:
        with urllib.request.urlopen(UPSTREAM, timeout=30) as r:
            upstream = json.load(r)
    except Exception as e:
        sys.exit("could not fetch upstream manifest: %s" % e)
    if not isinstance(upstream, list) or not upstream:
        sys.exit("upstream manifest is not a non-empty list; refusing to overwrite mods.json")

    merged = [ours] + [m for m in upstream if m.get("id") != ours["id"]]
    with open("mods.json", "w", encoding="utf8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("wrote mods.json: 1 local + %d upstream" % (len(merged) - 1))

main()
