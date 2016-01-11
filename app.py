from __future__ import print_function 
import flask
import flask.ext.restful
import werkzeug
from pymongo import MongoClient
from bson import json_util
import json
import ConfigParser 
import datetime
import os
import sys

app = flask.Flask(__name__)
UPLOAD_FOLDER = '/tmp/upload'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER



p = ConfigParser.ConfigParser()
p.read("config")
MONGODB_HOST = p.get('DB', 'MONGODB_HOST')
MONGODB_PORT = p.getint('DB', 'MONGODB_PORT')
DB_NAME = p.get('DB', 'DB_NAME')
COLLECTION_NAME = p.get('DB', 'COLLECTION_NAME')
KEY=p.get('GMAPS', 'KEY')

@app.before_request
def before_request():
	db = MongoClient(MONGODB_HOST, MONGODB_PORT)
	flask.g.collection = db[DB_NAME][COLLECTION_NAME]

@app.teardown_request
def teardown_request(exception):
    db = getattr(flask.g, 'db', None)
    if db is not None:
        db.close()	

""" html routes """
@app.route("/")
def index():
	return flask.render_template("index.j2")

@app.route("/users/<user>")
def user_landing(user):
	""" user page just redirect to albums page """
	return flask.redirect("/users/%s/albums" % user)

@app.route("/users/<user>/albums")
def get_albums(user):
	resp = flask.make_response(flask.render_template("albums.j2"))
	resp.set_cookie('user', user)
	return resp

@app.route("/users/<user>/albums/<album>")
def get_album(user, album):
	""" photos page """
	# if request to edit was made, do it:
	if flask.request.args.get('edit') == 'true':
		# there's got to be better way to get this:
		resp = flask.make_response(flask.render_template("photo_edit.j2"))
		resp.set_cookie('user', user)
		resp.set_cookie('album', album)
		return resp
	# default to photo_mapper view of album:		
	resp = flask.make_response(flask.render_template("photo_mapper.j2", KEY=KEY))
	resp.set_cookie('user', user)
	resp.set_cookie('album', album)
	return resp


""" json routes """
@app.route("/api/users/<user>/albums")
def album_api(user):
	""" return a list of albums given a user name """

	collection = flask.g.collection	
	albums = [ i for i in collection.distinct('album', {'user': user}) ]
	albums = json.dumps(albums, default=json_util.default)
	return albums

@app.route("/api/users/<user>/albums/<album>/photos", methods=['GET', 'POST'])
def photo_api(user,album):
	""" sort and return photo list json given user and album """

	def handle_file(f):
		filename = f.filename
		f.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

	if flask.request.method == 'POST':
		""" this shows file number but obviously only gets first one
		files = flask.request.files.getlist('0')
		for f in files: 
			print(f, file=sys.stderr)
		"""
		files = flask.request.files
		for f in files:
			print(files[f], file=sys.stderr)
			handle_file(files[f])
		return 'success'

	elif flask.request.method == 'GET':
		collection = flask.g.collection
		photos = [ i for i in collection.find({'user': user, 'album': album}, {'_id': False}) ]
		photos.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
		photos = json.dumps(photos, default=json_util.default)
		return photos

if __name__ == "__main__":
    PORT = p.getint('WEB', 'PORT')
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
