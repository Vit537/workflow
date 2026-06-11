"""Manejadores de excepciones de la API."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc: RequestValidationError):
        logging.error(f"[422] Validation error: {exc.errors()}")
        return JSONResponse(status_code=422, content={"detail": exc.errors()})
