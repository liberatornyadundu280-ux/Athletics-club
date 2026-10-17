@echo off
REM Start the STMS ML Inference Worker (Windows)

setlocal enabledelayedexpansion

REM Load environment variables from .env if exists
if exist ..\..\.env (
    for /f "tokens=1* delims==" %%a in ('type ..\..\.env ^| findstr /v "^#"') do (
        set %%a=%%b
    )
)

REM Default values
set MONGO_URI=%MONGODB_URI%
if "%MONGO_URI%"=="" set MONGO_URI=mongodb://localhost:27017

set MONGO_DB=%MONGO_DB%
if "%MONGO_DB%"=="" set MONGO_DB=stms_dev

set REDIS_URL=%REDIS_URL%
if "%REDIS_URL%"=="" set REDIS_URL=redis://localhost:6379

set MODEL_PATH=%MODEL_PATH%
if "%MODEL_PATH%"=="" set MODEL_PATH=.\models\model_next_workout_rpe_20261001_043023.pkl

set SCALER_PATH=%SCALER_PATH%
if "%SCALER_PATH%"=="" set SCALER_PATH=.\models\scaler.pkl

set CONFIG_PATH=%CONFIG_PATH%
if "%CONFIG_PATH%"=="" set CONFIG_PATH=.\config.local.yaml

set STREAM_KEY=%ML_INFERENCE_STREAM_KEY%
if "%STREAM_KEY%"=="" set STREAM_KEY=stms:recommendation:triggers

set CONSUMER_GROUP=%ML_INFERENCE_CONSUMER_GROUP%
if "%CONSUMER_GROUP%"=="" set CONSUMER_GROUP=inference-workers

set CONSUMER_NAME=%CONSUMER_NAME%
if "%CONSUMER_NAME%"=="" set CONSUMER_NAME=worker-1

echo Starting STMS Inference Worker...
echo MongoDB: %MONGO_URI%
echo Database: %MONGO_DB%
echo Redis: %REDIS_URL%
echo Model: %MODEL_PATH%
echo Scaler: %SCALER_PATH%
echo Config: %CONFIG_PATH%
echo Stream: %STREAM_KEY%
echo Consumer Group: %CONSUMER_GROUP%
echo Consumer Name: %CONSUMER_NAME%

REM Check if model exists
if not exist "%MODEL_PATH%" (
    echo ERROR: Model file not found at %MODEL_PATH%
    dir .\models\
    exit /b 1
)

REM Check if scaler exists
if not exist "%SCALER_PATH%" (
    echo WARNING: Scaler file not found at %SCALER_PATH%
)

REM Check if config exists
if not exist "%CONFIG_PATH%" (
    echo WARNING: Config file not found at %CONFIG_PATH%
)

REM Create virtual environment if needed
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate.bat
pip install -q -r requirements.txt

REM Run the worker
python inference_worker.py ^
    --mongo-uri "%MONGO_URI%" ^
    --database "%MONGO_DB%" ^
    --redis-url "%REDIS_URL%" ^
    --model-path "%MODEL_PATH%" ^
    --scaler-path "%SCALER_PATH%" ^
    --config "%CONFIG_PATH%" ^
    --stream-key "%STREAM_KEY%" ^
    --consumer-group "%CONSUMER_GROUP%" ^
    --consumer-name "%CONSUMER_NAME%"