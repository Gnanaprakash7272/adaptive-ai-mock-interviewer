# conftest.py — project root
# This file's presence anchors the pytest rootdir to this directory.
# Required on Windows with restricted drives (e.g. F:\) to prevent
# pytest 9.x from trying to stat the drive root and failing with PermissionError.

import os
import sys

# Make sure the project root is on sys.path for all tests.
_here = os.path.dirname(os.path.abspath(__file__))
if _here not in sys.path:
    sys.path.insert(0, _here)


import pytest


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """
    Reset the SlowAPI in-memory rate-limit storage before every test.

    Without this, requests from one test accumulate in the same bucket as
    the next test (all TestClient requests share IP 127.0.0.1), causing
    tests that run after a rate-limiting test to receive spurious 429 responses.

    The MemoryStorage object exposes a reset() method that clears all counters.
    """
    try:
        from api.auth import limiter
        storage = limiter._storage
        if hasattr(storage, "reset"):
            storage.reset()
        elif hasattr(storage, "storage"):
            # Older versions store in a plain dict
            storage.storage.clear()
    except Exception:
        # If SlowAPI is not installed yet or import fails, skip silently.
        pass
    yield
