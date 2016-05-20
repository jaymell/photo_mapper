from __future__ import print_function
from photo_mapper import app
import photo_mapper as pm
import flask
import flask_restful as fr
import sys
import json
from bson import json_util
import tempfile
import imghdr
import photo_importer
import datetime

api = fr.Api(app)

class User_list(fr.Resource):
    def get(self):
        """ the db query here is probably veeerrrryyyy slow,
            but since getting all users is probably not something
            that would actually be done that often, hoping it's an 
            outlier """

        col = pm.get_collection()
        users = [ i.keys()[0] for i in col.find({},{'_id': False}) ]
        photos = json.dumps(users, default=json_util.default)
        return users
api.add_resource(User_list, '/api/users')
 
app.route("/api/users/<user>/albums", methods=['GET'])
def album_api(user):
        """ returns list of albums -- since
                albums are retrieved from individual
                photo records """
        if pm.USE_S3:
                photo_url = pm.S3_URL
        else:
                photo_url = pm.LOCAL_URL

        if flask.request.method == 'GET':
                col = pm.get_collection()
                albums = [ i for i in col.distinct('album', {'user': user}) ]
                albums = json.dumps(albums, default=json_util.default)
                return albums
        else:
                return 'error', 405


def handle_file(f, user, album):
        """ do appropriate stuff with uploaded files, including
                db insertion and permanent s3/local storage"""

        col = pm.get_collection()
        # if s3 enabled, location == s3 bucket, else it's
        # globally defined UPLOAD_FOLDER:
        if pm.USE_S3:
                location = pm.get_s3()
        else:
                location = pm.UPLOAD_FOLDER

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
                col.insert_one(jpeg.db_entry(user, album))
        except Exception as e:
                print('Failed to update database with %s: %s' % (filename, e), file=sys.stderr)
                return

        try:
                # saves all the different sizes at once -- value of 
                # USE_S3 indicates whether save function assumes s3 or local storage:
                jpeg.save(location, s3=pm.USE_S3)
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

        col = pm.get_collection()
        if flask.request.method == 'POST':
                """ this shows file number but obviously only gets first one
                files = flask.request.files.getlist('0')
                for f in files: 
                        print(f, file=sys.stderr)
                """
                files = flask.request.files
                for f in files:
                        print(files[f], file=sys.stderr)
                        handle_file(files[f], user, album)
                return 'success'

        elif flask.request.method == 'GET':
                photos = [ i for i in col.find({'user': user, 'album': album}, {'_id': False}) ]
                photos.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
                photos = json.dumps(photos, default=json_util.default)
                return photos

