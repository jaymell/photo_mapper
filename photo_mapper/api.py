from __future__ import print_function
from photo_mapper import app
import photo_mapper as pm
import photo_importer
import flask
import flask_restful as fr
from flask_restful import fields, marshal, reqparse
import flask_sqlalchemy as fsql
import sys
import json
from bson import json_util
import imghdr
import datetime
import models

api = fr.Api(app)

size_fields = {
}  

photo_fields =  {
  'photo': fields.Url('photo'),
  #'albums': [ i.album_name for i in self.albums ],
  #'sizes': [ i.serialize for i in self.sizes ],
  'latitude': fields.String,
  'longitude': fields.String,
  'type': fields.String,
  'date': fields.String
}

def insert(record):
    """ insert record or abort """
    try:
        pm.db.session.add(record)
        pm.db.session.commit()
    # this could be a duplicate or any sort of malformed request, needs
    # some logic: 
    #except fsql.sqlalchemy.exc.IntegrityError:
    except Exception as e:
      print("Error: %s" % e)
      fr.abort(400)
    #except Exception as e:
    #  print("Error: %s" % e)
    #  fr.abort(500)

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
api.add_resource(UserListAPI, '/api/users', endpoint='users')
 
class UserAPI(fr.Resource):
  def get(self, user_name):
    # FIXME:
    result = models.User.query.filter_by(user_name=user_name).first()
    if result:
        return result.serialize
    else:
        return 'No records found', 404
api.add_resource(UserAPI, '/api/users/<user_name>', endpoint='user')

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
api.add_resource(AlbumListAPI, '/api/users/<user_name>/albums', endpoint='albums')

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
api.add_resource(AlbumAPI, '/api/users/<user_name>/albums/<album_name>', endpoint='album')

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
    """ this route takes a file only -- it gets the relevant
        meta out of it with photo_importer module, 
        puts it into Photo table, puts sizes into Sizes table,
        then saves it to storage -- if all successful, return uri
        so photo can then be added to albums via separate request """
    # FIXME:
    user = models.User.query.filter_by(user_name=user_name).first()
    if not user:
      fr.abort(404)
    location = pm.get_s3() if app.config['USE_S3'] else app.config['UPLOAD_FOLDER']
    # should be only one, but files is a dict, so iterate:
    for f in flask.request.files:
      f = flask.request.files[f]
      photo_type = imghdr.what(f)
      if photo_type not in app.config['SUPPORTED_TYPES']:
        msg = '%s not supported' % photo_type
        print(msg)
        return {'error': msg}, 415 
      f.seek(0)
      jpeg = photo_importer.Jpeg(f)
      # save various sizes of files:
      jpeg.save(location, s3=app.config['USE_S3'])
      # insert stuff in db:
      # FIXME: inserts need to be ATOMIC:
      photo = models.Photo(
        user_id=user.id,
        md5sum=jpeg.md5sum,
        date=jpeg.date,
        latitude=jpeg.jpgps.coordinates()[0],
        longitude=jpeg.jpgps.coordinates()[1],
        photo_type=photo_type

        )
      insert(photo)
      # if prior insert was successful, photo.id should
      # be available to use as FK, so insert photo sizes:
      photo_sizes = [] 
      for size in jpeg.sizes:
        photo_size = models.PhotoSize(
          photo_id = photo.id,
          size = size,
          width = jpeg.sizes[size]['width'],
          height = jpeg.sizes[size]['height'],
          name = jpeg.sizes[size]['name']
        )
        insert(photo_size)
        photo_sizes.append(photo_size)
    return photo.serialize, 200
    #return {'photo': marshal(photo, photo_fields) }
api.add_resource(PhotoListAPI, '/api/users/<user_name>/photos', endpoint='photos')

class PhotoAPI(fr.Resource):
  pass
api.add_resource(PhotoAPI, '/api/users/<user_name>/photos/<photo>', endpoint='photo')


