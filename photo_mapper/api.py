from __future__ import print_function
from photo_mapper import app
import photo_mapper as pm
import flask
import flask_restful as fr
import sys
import json
from bson import json_util
import imghdr
import datetime

api = fr.Api(app)

class UserListAPI(fr.Resource):
    def get(self):
        """ the db query here is probably veeerrrryyyy slow,
            but since getting all users is probably not something
            that would actually be done that often, hoping it's an 
            outlier """

        col = pm.get_collection()
        users = [ i.keys()[0] for i in col.find({},{'_id': False}) ]
        photos = json.dumps(users, default=json_util.default)
        return users
api.add_resource(UserListAPI, '/api/users')
 
class UserAPI(fr.Resource):
    def get(self):
        pass
api.add_resource(UserAPI, '/api/users/<user>')

@app.route("/api/users/<user>/albums", methods=['GET'])
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
                        pm.handle_file(files[f], user, album)
                return 'success'

        elif flask.request.method == 'GET':
                photos = [ i for i in col.find({'user': user, 'album': album}, {'_id': False}) ]
                photos.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
                photos = json.dumps(photos, default=json_util.default)
                return photos

