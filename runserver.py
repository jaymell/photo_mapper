from photo_mapper import app

if __name__ == "__main__":
    PORT = 5000
    LISTEN_ADDRESS = '0.0.0.0'
    app.run(host=LISTEN_ADDRESS,port=PORT,debug=True)

