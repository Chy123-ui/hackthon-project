import colorama
colorama.init()

if __name__ == "__main__":
    import sys, os
    # Ensure the current dir is on path so 'import app' works in build
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import uvicorn
    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000)
    except KeyboardInterrupt:
        sys.exit(0)
