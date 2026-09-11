"""Inject Playwright-exported cookies into ZAP HTTP sessions (see zap-baseline --hook)."""

from __future__ import annotations

import json
import logging
import os
from urllib.parse import urlparse

COOKIE_FILE = os.environ.get("ZAP_COOKIE_FILE", "/zap/wrk/cookies.json")
SESSION_NAME = os.environ.get("ZAP_SESSION_NAME", "zeloxtag-auth")


def _session_site(target: str) -> str:
    """ZAP httpsessions site key (host:port, default ports omitted)."""
    parsed = urlparse(target)
    host = parsed.hostname or ""
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == "https" else 80
    if (parsed.scheme == "https" and port == 443) or (
        parsed.scheme == "http" and port == 80
    ):
        return host
    return f"{host}:{port}"


def zap_started(zap, target):
    if not os.path.isfile(COOKIE_FILE):
        logging.warning("No cookie file at %s — scan stays unauthenticated", COOKIE_FILE)
        return

    with open(COOKIE_FILE, encoding="utf-8") as handle:
        payload = json.load(handle)

    cookies = payload.get("cookies", payload)
    if not isinstance(cookies, list) or not cookies:
        logging.warning("Cookie file empty — scan stays unauthenticated")
        return

    site = _session_site(target)
    logging.info("Loading %d cookies for ZAP site %s", len(cookies), site)

    zap.httpsessions.add_session_token(site, SESSION_NAME)
    zap.httpsessions.create_empty_session(site, SESSION_NAME)

    for cookie in cookies:
        name = cookie.get("name")
        value = cookie.get("value")
        if not name or value is None:
            continue
        zap.httpsessions.set_session_token_value(site, SESSION_NAME, name, value)
        logging.debug("Session token: %s", name)

    zap.httpsessions.set_active_session(site, SESSION_NAME)
    active = zap.httpsessions.active_session(site)
    logging.info("Active ZAP session: %s", active)
