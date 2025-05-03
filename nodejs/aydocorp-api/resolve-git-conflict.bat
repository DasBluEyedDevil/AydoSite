@echo off
echo Resolving Git conflict with package.json and package-lock.json

REM Step 1: Stash local changes
echo Stashing local changes...
git stash

REM Step 2: Pull the latest changes from the remote repository
echo Pulling latest changes from remote...
git pull

REM Step 3: Apply stashed changes if needed
echo If you need to apply your local changes, run: git stash apply
echo If there are conflicts, you'll need to resolve them manually.
echo After resolving conflicts, run: git add . && git commit -m "Merge remote changes with local modifications"

echo Git conflict resolution completed.
pause