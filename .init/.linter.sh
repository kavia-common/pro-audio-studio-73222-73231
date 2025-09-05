#!/bin/bash
cd /home/kavia/workspace/code-generation/pro-audio-studio-73222-73231/frontend_client
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

