@echo off
echo "Running offline build script..."

REM Activate virtual environment and install python dependencies
echo "Installing Python dependencies..."
call ..\backend\venv\Scripts\activate.bat
pip install -r ..\backend\requirements.txt
pip install pyinstaller

REM Run the build script
echo "Building the application for Windows..."
npm run build:win

echo "Build script finished."