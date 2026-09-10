#!/usr/bin/env python3
"""Dependency-free browser verification in an isolated Chrome profile."""
import functools
import http.server
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
CHROME = os.environ.get('CHROME_BIN', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

def main():
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with tempfile.TemporaryDirectory(prefix='zalgo-browser-test-') as profile:
            with tempfile.TemporaryFile() as errors:
                child = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--no-first-run',
                    '--disable-background-networking', '--remote-debugging-port=0', '--user-data-dir='+profile,
                    f'http://127.0.0.1:{server.server_port}/tests/browser-tests.html'], stdout=subprocess.DEVNULL, stderr=errors)
                try:
                    deadline = time.monotonic()+35
                    while time.monotonic()<deadline:
                        try:
                            port = (Path(profile)/'DevToolsActivePort').read_text().splitlines()[0]
                            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=1) as response:
                                targets = json.load(response)
                            for target in targets:
                                title = target.get('title', '')
                                if title.startswith('ZALGO_TESTS:'):
                                    _, status, report = title.split(':', 2)
                                    print(urllib.parse.unquote(report))
                                    return 0 if status=='pass' else 1
                        except (OSError, ValueError, IndexError):
                            pass
                        time.sleep(.05)
                    errors.seek(0)
                    print(errors.read().decode(errors='replace')[-1500:])
                    print('Browser suite did not report a result.')
                    return 1
                finally:
                    child.terminate()
                    try:
                        child.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        child.kill()
                        child.wait(timeout=5)
    finally:
        server.shutdown()
        server.server_close()

if __name__=='__main__':
    raise SystemExit(main())
