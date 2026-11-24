# Send a Python file (or stdin) to Blender's MCP bridge and print the result.
#
#   python3 -I scripts/blender/bridge.py some_script.py
#
# The bridge is Blender's official MCP extension (Edit > Preferences >
# Add-ons > MCP > Start), listening on localhost:9876. It runs the code in
# Blender's main thread. Used by the model pipeline (CLAUDE.md, "Models").
import json, socket, sys
code = open(sys.argv[1]).read() if len(sys.argv) > 1 else sys.stdin.read()
s = socket.create_connection(("127.0.0.1", 9876), timeout=120)
s.sendall(json.dumps({"type": "execute", "code": code, "strict_json": False}).encode() + b"\0")
buf = b""
while True:
    chunk = s.recv(65536)
    if not chunk: break
    buf += chunk
    if buf.endswith(b"\0"): break
print(buf.rstrip(b"\0").decode())
