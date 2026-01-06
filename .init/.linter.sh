#!/bin/bash
cd /home/kavia/workspace/code-generation/local-todo-list-195529-195539/todo_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

