from flask import Flask
from flask import render_template
from pymongo import MongoClient
from bson import json_util
from bson.json_util import dumps
import json
import pycountry 
import ConfigParser 

app = Flask(__name__)

MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017
DB_NAME = 'top_sites'
connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
config = 'gmaps.key'

@app.route("/")
def index():
	parser = ConfigParser.SafeConfigParser()
        parser.read(config)
	KEY=parser.get('KEYS', 'KEY')
	return render_template("index.html", KEY=KEY)

@app.route("/json")
def get_json():
	COLLECTION_NAME = 'gmaps'
	collection = connection[DB_NAME][COLLECTION_NAME]
	sites = [ i for i in collection.find({}, {'_id': False}) ]
	sites = json.dumps(sites, default=json_util.default)
	return sites
	
@app.route("/ips")
def get_ips():
	COLLECTION_NAME = 'gmaps_ips'
        collection = connection[DB_NAME][COLLECTION_NAME]
        ips = [ i for i in collection.find({}, {'_id': False}) ]
        ips = json.dumps(ips, default=json_util.default)
        return ips 
	
@app.route("/test")
def test():
        return render_template("test.html")

if __name__ == "__main__":
	app.run(host='0.0.0.0',port=5000,debug=True)

