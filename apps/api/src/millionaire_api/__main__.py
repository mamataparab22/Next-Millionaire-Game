import uvicorn

def main():
    uvicorn.run("millionaire_api.main:app", host="0.0.0.0", port=5177, reload=True)

if __name__ == "__main__":
    main()
