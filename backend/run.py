import colorama
colorama.init()

if __name__ == "__main__":
    import sys
    import uvicorn
    try:
        uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
    except KeyboardInterrupt:
        sys.exit(0)
