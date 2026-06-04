@echo off
REM Portable dev launcher — assumes Node.js 20+ is installed and on PATH.
REM If `npm` is not found, install Node from https://nodejs.org (LTS) and reopen the terminal.
call npm run dev -- --host
