#!/bin/bash
# Azure App Service startup script

# Install dependencies
pip install -r requirements.txt

# Run the application
cd backend || cd .
uvicorn app.main:app --host 0.0.0.0 --port 8000
