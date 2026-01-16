@echo off
REM Deployment Script for pitch-v6 (Windows)
REM This script prepares and deploys the application to Vercel

echo.
echo ========================================
echo   pitch-v6 Deployment Script (Windows)
echo ========================================
echo.

REM Step 1: Check prerequisites
echo [Step 1/7] Checking prerequisites...
echo.

where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed. Please install Git first.
    pause
    exit /b 1
)
echo [OK] Git found

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed. Please install Node.js first.
    pause
    exit /b 1
)
echo [OK] npm found

where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Vercel CLI not found. Installing...
    npm install -g vercel
)
echo [OK] Vercel CLI ready
echo.

REM Step 2: Check required files
echo [Step 2/7] Checking required files...
echo.

set "missing_files=0"

if not exist "package.json" (
    echo [ERROR] Missing: package.json
    set "missing_files=1"
) else (
    echo [OK] Found: package.json
)

if not exist "vercel.json" (
    echo [ERROR] Missing: vercel.json
    set "missing_files=1"
) else (
    echo [OK] Found: vercel.json
)

if not exist "requirements.txt" (
    echo [ERROR] Missing: requirements.txt
    set "missing_files=1"
) else (
    echo [OK] Found: requirements.txt
)

if not exist "lib\audio-extractor.ts" (
    echo [ERROR] Missing: lib\audio-extractor.ts
    set "missing_files=1"
) else (
    echo [OK] Found: lib\audio-extractor.ts
)

if not exist "app\api\extract-audio\route.ts" (
    echo [ERROR] Missing: app\api\extract-audio\route.ts
    set "missing_files=1"
) else (
    echo [OK] Found: app\api\extract-audio\route.ts
)

if not exist "app\api\analyze-eye-contact\route.ts" (
    echo [ERROR] Missing: app\api\analyze-eye-contact\route.ts
    set "missing_files=1"
) else (
    echo [OK] Found: app\api\analyze-eye-contact\route.ts
)

if not exist "scripts\enhanced_eye_contact.py" (
    echo [ERROR] Missing: scripts\enhanced_eye_contact.py
    set "missing_files=1"
) else (
    echo [OK] Found: scripts\enhanced_eye_contact.py
)

if "%missing_files%"=="1" (
    echo.
    echo [ERROR] Missing required files. Please ensure all files are present.
    pause
    exit /b 1
)
echo.

REM Step 3: Check environment variables
echo [Step 3/7] Checking environment variables...
echo.

if not exist ".env.local" (
    echo [WARNING] .env.local not found. Creating template...
    (
        echo # Required API Keys
        echo ASSEMBLYAI_API_KEY=your_assemblyai_key_here
        echo GROQ_API_KEY=your_groq_key_here
        echo.
        echo # Optional
        echo BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
        echo FFMPEG_PATH=/usr/bin/ffmpeg
        echo PYTHON_PATH=/usr/bin/python3
    ) > .env.local
    echo [INFO] Created .env.local template. Please fill in your API keys.
    echo        Then run this script again.
    echo.
    echo Get API keys from:
    echo - AssemblyAI: https://www.assemblyai.com/dashboard/signup
    echo - Groq: https://console.groq.com/keys
    pause
    exit /b 0
)

findstr /C:"your_assemblyai_key_here" .env.local >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] ASSEMBLYAI_API_KEY not set in .env.local
    echo           Get your key from: https://www.assemblyai.com/dashboard/signup
    pause
    exit /b 1
)

findstr /C:"your_groq_key_here" .env.local >nul
if %ERRORLEVEL% EQU 0 (
    echo [WARNING] GROQ_API_KEY not set in .env.local
    echo           Get your key from: https://console.groq.com/keys
    pause
    exit /b 1
)

echo [OK] Environment variables configured
echo.

REM Step 4: Install dependencies
echo [Step 4/7] Installing dependencies...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo.

REM Step 5: Build locally to test
echo [Step 5/7] Testing build...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed. Please fix errors before deploying.
    pause
    exit /b 1
)
echo [OK] Build successful
echo.

REM Step 6: Commit changes
echo [Step 6/7] Committing changes...
echo.

git status --short >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    git diff-index --quiet HEAD --
    if %ERRORLEVEL% NEQ 0 (
        echo [INFO] Uncommitted changes found. Committing...
        git add .
        git commit -m "Deploy: MP4 processing with eye contact analysis"
        echo [OK] Changes committed
    ) else (
        echo [OK] No uncommitted changes
    )
)
echo.

REM Step 7: Deploy to Vercel
echo [Step 7/7] Deploying to Vercel...
echo.
echo Choose deployment type:
echo 1) Production deployment (main branch)
echo 2) Preview deployment (test first)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo [INFO] Deploying to production...
    call vercel --prod
) else if "%choice%"=="2" (
    echo.
    echo [INFO] Creating preview deployment...
    call vercel
) else (
    echo [ERROR] Invalid choice. Exiting.
    pause
    exit /b 1
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Deployment Successful!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Test the deployed application
    echo 2. Check Vercel dashboard for logs
    echo 3. Verify all 6 metrics are working
    echo.
    echo Documentation:
    echo - Deployment Guide: DEPLOYMENT_GUIDE.md
    echo - Quick Start: QUICK_START_MP4.md
    echo - Full Docs: MP4_DOCUMENTATION_INDEX.md
    echo.
) else (
    echo.
    echo [ERROR] Deployment failed. Check the error messages above.
    echo         For help, see DEPLOYMENT_GUIDE.md
    pause
    exit /b 1
)

pause
