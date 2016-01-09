import flask
from pymongo import MongoClient
from bson import json_util
import json
import ConfigParser 
import datetime

app = flask.Flask(__name__)

p = ConfigParser.ConfigParser()
p.read("config")
MONGODB_HOST = p.get('DB', 'MONGODB_HOST')
MONGODB_PORT = p.getint('DB', 'MONGODB_PORT')
DB_NAME = p.get('DB', 'DB_NAME')
COLLECTION_NAME = p.get('DB', 'COLLECTION_NAME')
KEY = p.get('GMAPS', 'KEY')

@app.before_request
def before_request():
	flask.g.db = MongoClient(MONGODB_HOST, MONGODB_PORT)

@app.teardown_request
def teardown_request(exception):
    db = getattr(flask.g, 'db', None)
    if db is not None:
        db.close()	

@app.route("/")
def index():
	return flask.render_template("index.html", KEY=KEY)

@app.route("/photos")
def get_json():
	collection = flask.g.db[DB_NAME][COLLECTION_NAME]
	sites = [ i for i in collection.find({}, {'_id': False}) ]
	sites.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
	sites = json.dumps(sites, default=json_util.default)
	return sites


if __name__ == "__main__":
	PORT = p.get('WEB', 'PORT')
	LISTEN_ADDRESS = p.get('WEB', 'LISTEN_ADDRESS')
	app.run(host=LISTEN_ADDRESS,port=PORT,debug=True)

"""
old jscript for deletions:
router.delete('/photos', function(req, res) {
    var toDelete = req.body.id;
    console.log('attempting to delete: ', toDelete);
    // regex to verify an md5sum was actually passed:
    if(!/^[a-fA-F0-9]{32}$/.test(toDelete)) {
        console.log("unable to delete -- doesn't match regex");
        res.status(400).send();
    }
    var collection = db.get().collection(COLLECTION);
    collection.deleteOne({'md5sum': toDelete}, function(err, r) {
        if (err) res.status(500).send({error: err});
        if (r.deletedCount != 1) {
            res.status(404).send();
        } else {
            // database delete was successful
            res.status(200).send();
            fs.unlink(app.staticFilePath+'/img/'+toDelete+'.jpg', function(err) {
                if(err) console.log('Failed to delete',toDelete,'\n\t',err);
                else console.log('Successfully deleted', toDelete);
            });
            fs.unlink(app.staticFilePath+'/img/'+toDelete+'-thumbnail.jpg', function(err) {
                if(err) console.log('Failed to delete',toDelete,'thumbnail,\n\t',err);
                else console.log('Successfully deleted', toDelete, 'thumbnail');
            });
        }
    });
});
"""
