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
import tempfile
import imghdr
import photo_importer
import boto

app = flask.Flask(__name__)
app.config.update(
    # 100 MB upload limit:
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024,
    PROPAGATE_EXCEPTIONS = True,
    Debug = True
)
p = ConfigParser.ConfigParser()
p.read("config")
MONGODB_HOST = os.environ.get('MONGODB_HOST', p.get('DB', 'MONGODB_HOST'))
MONGODB_PORT = int(os.environ.get('MONGODB_PORT', p.get('DB', 'MONGODB_PORT')))
DB_NAME = os.environ.get('DB_NAME', p.get('DB', 'DB_NAME'))
COLLECTION_NAME = os.environ.get('COLLECTION_NAME', p.get('DB', 'COLLECTION_NAME'))
GMAPS_KEY = os.environ.get('KEY', p.get('GMAPS', 'KEY'))
S3_BUCKET = os.environ.get('S3_BUCKET', p.get('STORAGE', 'S3_BUCKET'))
S3_URL = os.environ.get('S3_URL', p.get('STORAGE', 'S3_URL'))
LOCAL_URL = os.environ.get('LOCAL_URL', p.get('STORAGE', 'LOCAL_URL'))
UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', p.get('STORAGE', 'UPLOAD_FOLDER'))

# constant set at runtime to disable use of s3 -- expects True or False
# -- but assume True:
USE_S3 = os.environ.get('USE_S3')
if USE_S3:
	if USE_S3.lower() == 'false':
		USE_S3 = False
	else:
		USE_S3 = True

def get_collection():
	""" handles connections to Mongo; pymongo.MongoClient does its own
		pooling, so nothing fancy required --- just make a handle to
		the db collection available """

	collection = getattr(flask.g, '_collection', None)
	if collection is None:
		db = MongoClient(MONGODB_HOST, MONGODB_PORT)
		collection = flask.g._collection = db[DB_NAME][COLLECTION_NAME]
	return collection

def get_s3():
	""" handles connections to s3; only creation new object if
		doesn't already exist; boto is supposed to be smart enough
		to handle re-connections itself """
	
	bucket = getattr(flask.g, '_bucket', None)
	if bucket is None:
		connection = boto.connect_s3()
        bucket = flask.g._bucket = connection.get_bucket(S3_BUCKET)
	return bucket
	
""" html routes """
@app.route("/")
def index():
	""" landing page """
	return flask.render_template("index.j2")

@app.route("/users/<user>")
def user_landing(user):
	""" user page... just redirect to albums page for now """
	return flask.redirect("/users/%s/albums" % user)

@app.route("/users/<user>/albums")
def get_albums(user):
	""" render albums template -- save user in cookie """

	if USE_S3:
		photo_url = S3_URL
	else:
		photo_url = LOCAL_URL

	resp = flask.make_response(flask.render_template("albums.j2", photo_route=photo_url))
	resp.set_cookie('user', user)
	return resp

@app.route("/users/<user>/albums/<album>")
def get_album(user, album):
	""" photos page """

	if USE_S3:
		photo_url = S3_URL
	else:
		photo_url = LOCAL_URL

	# if request to edit was made, do it:
	if flask.request.args.get('edit') == 'true':
		# there's got to be better way to get this:
		resp = flask.make_response(flask.render_template("photo_edit.j2", photo_route=photo_url))
		resp.set_cookie('user', user)
		resp.set_cookie('album', album)
		return resp

	resp = flask.make_response(flask.render_template("photo_mapper.j2", KEY=GMAPS_KEY, photo_route=photo_url))
	resp.set_cookie('user', user)
	resp.set_cookie('album', album)
	return resp


""" json routes """
@app.route("/api/users/<user>/albums", methods=['GET'])
def album_api(user):
	""" returns list of albums -- since
		albums are retrieved from individual
		photo records """
	if USE_S3:
		photo_url = S3_URL
	else:
		photo_url = LOCAL_URL

	if flask.request.method == 'GET':
		collection = get_collection()
		albums = [ i for i in collection.distinct('album', {'user': user}) ]
		albums = json.dumps(albums, default=json_util.default)
		return albums
	else:
		return 'error', 405

def handle_file(f, user, album):
	""" do appropriate stuff with uploaded files, including
		db insertion and permanent s3/local storage"""

	collection = get_collection()
	# if s3 enabled, location == s3 bucket, else it's
	# globally defined UPLOAD_FOLDER:
	if USE_S3:
		location = get_s3()
	else:
		location = UPLOAD_FOLDER

	filename = f.filename
	EXT = 'jpeg'

	try:
		temp_f = tempfile.NamedTemporaryFile()
		f.save(temp_f)
	except Exception as e:
		print('Failed to save %s to temp file: %s' % (filename, e), file=sys.stderr)
		return

	temp_f.seek(0)
	if not imghdr.what(temp_f.name) == EXT:
		print('%s not a %s' % (filename, EXT), file=sys.stderr)
		return
	
	####
	# create Jpeg object from file:
	####
	try:
		temp_f.seek(0)
		jpeg = photo_importer.Jpeg(temp_f.name)
	except Exception as e:
		print('Failed to create jpeg object from %s: %s' % (filename, e), file=sys.stderr)
		return

	### should I check for DB duplicates here?
	try:
		collection.insert_one(jpeg.db_entry(user, album))	
	except Exception as e:
		print('Failed to update database with %s: %s' % (filename, e), file=sys.stderr)
		return

	try:
		# saves all the different sizes at once -- value of 
		# USE_S3 indicates whether save function assumes s3 or local storage:
		jpeg.save(location, s3=USE_S3)			
	except Exception as e:
		print("Failed to write to storage: %s" % e, file=sys.stderr)
	else:
		print('Successfully saved %s to storage' % jpeg.name, file=sys.stderr)

@app.route("/api/users/<user>/albums/<album>/photos", methods=['GET', 'POST'])
def photo_api(user, album):
	""" GET: sort and return photo list json given user and album 
		POST: expects photo uploads, not json, does the storage 
			of photos and db update
	"""

        collection = get_collection()
	if flask.request.method == 'POST':
		""" this shows file number but obviously only gets first one
		files = flask.request.files.getlist('0')
		for f in files: 
			print(f, file=sys.stderr)
		"""
		files = flask.request.files

                ### need to check user and
                ### album before unleashing on db:
                if not collection.find(
                    {"$and": 
                        [ 
                         {"user": user}, 
                         {"album": album}
                        ]
                    }).count():
                    return 'fuck you', 404
		for f in files:
			print(files[f], file=sys.stderr)
			handle_file(files[f], user, album)
		return 'success'

	elif flask.request.method == 'GET':
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
