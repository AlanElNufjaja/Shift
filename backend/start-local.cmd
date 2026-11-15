@echo off
REM Earthdata automation is deliberately enabled ONLY for local Windows testing.
set "FIELD_SHIFT_APPEEARS_LOCAL_MODE=1"
py -m uvicorn backend.app:app --host 127.0.0.1 --reload --port 8000
