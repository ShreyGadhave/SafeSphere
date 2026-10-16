"""Logging setup shared by the app and background jobs."""

import logging


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # httpx logs every request at INFO, which would leak prompt URLs into logs.
    logging.getLogger("httpx").setLevel(logging.WARNING)
