from __future__ import print_function
from photo_mapper import app
import photo_mapper as pm
import photo_importer
import flask
import flask_restful as fr
from flask_restful import reqparse
import flask_sqlalchemy as fsql
import sys
import json
from bson import json_util
import imghdr
import datetime
import models

api = fr.Api(app)

def insert(record):
    """ insert record or abort """
    try:
        pm.db.session.add(record)
        pm.db.session.commit()
    except fsql.sqlalchemy.exc.IntegrityError:
      # this could be a duplicate or any sort of malformed request: 
      fr.abort(400)
    except Exception as e:
      print("Error: %s" % e)
      fr.abort(500)

class UserListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('user_name', type = str, required = True,
      help = "No username provided")
    self.reqparse.add_argument('email', type = str, required = True,
      help = "No email provided")
    super(UserListAPI, self).__init__()

  def get(self):
    # make this more robust:
    return [ i.serialize for i in models.User.query.all() ]

  def post(self):
    args = self.reqparse.parse_args()
    user = models.User(args.user_name, args.email)
    # will abort if it fails: 
    insert(user)
    return user.serialize, 200
api.add_resource(UserListAPI, '/api/users')
 
class UserAPI(fr.Resource):
  def get(self, user_name):
    # FIXME:
    result = models.User.query.filter_by(user_name=user_name).first()
    if result:
        return result.serialize
    else:
        return 'No records found', 404
api.add_resource(UserAPI, '/api/users/<user_name>')

class AlbumListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('album_name', type = str, required = True,
      help = "No album name provided")
    super(AlbumListAPI, self).__init__()

  def post(self, user_name):
    """ FIXME: this function needs some sanity checking on
        album name """
    args = self.reqparse.parse_args()
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    album = models.Album(args.album_name, user.id)
    # will abort if it fails: 
    insert(album)
    return album.serialize, 200

  def get(self, user_name):
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    if not user:
      return 'user not found', 404
    return [ i.serialize for i in models.Album.query.filter_by(user_id=user.id).all() ]
api.add_resource(AlbumListAPI, '/api/users/<user_name>/albums')

class AlbumAPI(fr.Resource):
  def get(self, user_name, album_name):
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    if not user:
      return 'user not found', 404
    # FIXME:
    result = models.Album.query.filter_by(user_id=user.id, album_name=album_name).first()
    if result:
        return result.serialize
    else:
        return 'No records found', 404
api.add_resource(AlbumAPI, '/api/users/<user_name>/albums/<album_name>')

class PhotoListAPI(fr.Resource):
  """ photos are at same hierarchic level as albums """
#  def __init__(self):
#    self.reqparse = reqparse.RequestParser()
#    super(PhotoListAPI, self).__init__()

  def get(self, user_name):
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    if not user:
      fr.abort(404)
    return [ i.serialize for i in models.Photo.query.filter_by(user_id=user.id).all() ]

  def post(self, user_name):
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    if not user:
      fr.abort(404)
    # even though should only one, files is a dict, so iterate:
    location = pm.get_s3() if app.config['USE_S3'] else app.config['UPLOAD_FOLDER']
    for f in flask.request.files:
      f = flask.request.files[f]
      image_type = imghdr.what(f)
      if image_type not in app.config['SUPPORTED_TYPES']:
        msg = '%s not supported' % image_type
        print(msg)
        return {'error': msg}, 415 
      f.seek(0)
      jpeg = photo_importer.Jpeg(f)
      photo = models.Photo(
        user_id=user.id,
        md5sum=jpeg.md5sum,
        date=jpeg.date,
        latitude=jpeg.jpgps.coordinates()[0],
        longitude=jpeg.jpgps.coordinates()[1]
        )
      insert(photo)
      # if prior insert was successful, photo.id should
      # be available to use as FK, so insert photo sizes:
      for size in jpeg.sizes:
        photo_size = models.PhotoSize(
          photo_id=photo.id,
          size=size,
          width=jpeg.sizes[size]['width'],
          height=jpeg.sizes[size]['height'],
        )
        insert(photo_size)
      # finally, actually write all sizes to storage:
      jpeg.save(location, s3=app.config['USE_S3'])
    return 'success', 200

api.add_resource(PhotoListAPI, '/api/users/<user_name>/photos')

class PhotoAPI(fr.Resource):
  pass
api.add_resource(PhotoAPI, '/api/users/<user_name>/photos/<photo>')

#@app.route("/api/users/<user>/albums", methods=['GET'])
#def album_api(user):
#""" returns list of albums -- since
#albums are retrieved from individual
#photo records """
#if flask.request.method == 'GET':
#col = pm.get_collection()
#                albums = [ i for i in col.distinct('album', {'user': user}) ]
#                albums = json.dumps(albums, default=json_util.default)
#                return albums
#        else:
#                return 'error', 405


#@app.route("/api/users/<user>/albums/<album>/photos", methods=['GET', 'POST'])
#def photo_api(user, album):
#        """ GET: sort and return photo list json given user and album 
#                POST: expects photo uploads, not json, does the storage 
#                        of photos and db update
#        """
#
#        col = pm.get_collection()
#        if flask.request.method == 'POST':
#                """ this shows file number but obviously only gets first one
#                files = flask.request.files.getlist('0')
#                for f in files: 
#                        print(f, file=sys.stderr)
#                """
#                files = flask.request.files
#                for f in files:
#                        print(files[f], file=sys.stderr)
#                        pm.handle_file(files[f], user, album)
#                return 'success'
#
#        elif flask.request.method == 'GET':
#                photos = [ i for i in col.find({'user': user, 'album': album}, {'_id': False}) ]
#                photos.sort(key=lambda k: datetime.datetime.strptime(k['date'],'%Y-%m-%d %H:%M:%S'))
#                photos = json.dumps(photos, default=json_util.default)
#                return photos
#
