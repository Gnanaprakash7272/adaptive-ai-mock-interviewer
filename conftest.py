# conftest.py — project root
# This file's presence prevents pytest from scanning above this directory.
# This is required on Windows with network/external drives to avoid
# PermissionError when pytest tries to stat the drive root (e.g. F:\).
