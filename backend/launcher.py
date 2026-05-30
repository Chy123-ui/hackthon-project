import os, sys, io, time, threading, webbrowser

def open_browser():
    time.sleep(2)
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    if sys.stdout is None:
        sys.stdout = sys.stderr = open(os.devnull, "w")
    import uvicorn
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="warning")
