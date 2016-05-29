from __future__ import print_function
from photo_mapper import app, db
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
from flask_marshmallow import Marshmallow

api = fr.Api(app)
marsh = Marshmallow(app)


def build_link(name):
  """ i.e., take a picture's name and prepend appropriate URL to it """
  location = app.config['S3_URL'] if app.config['USE_S3'] else app.config['LOCAL_URL']
  return location + name

def insert(record):
    """ insert record or abort """
    try:
      db.session.add(record)
      db.session.commit()
    # this could be a duplicate or any sort of malformed request, needs
    # some logic: 
    #except fsql.sqlalchemy.exc.IntegrityError:
    except Exception as e:
      print("Error: %s" % e)
      fr.abort(400)
    #except Exception as e:
    #  print("Error: %s" % e)
    #  fr.abort(500)

#### serialization schema
class UserSchema(marsh.Schema):
  uri = marsh.UrlFor('user', user_id='<user_id>')
  user_name = marsh.String()

class AlbumSchema(marsh.Schema): 
  uri = marsh.UrlFor('album', album_id='<album_id>', user_id='<user_id>')
  album_id = marsh.Int() 
  album_name = marsh.String() 
 
class PhotoSizeSchema(marsh.Schema): 
  photoSize_id = marsh.Int() 
  photo_id = marsh.Int() 
  size = marsh.String() 
  width = marsh.Int() 
  height = marsh.Int() 
  name = marsh.Function(lambda x: build_link(x.name)) 
 
class PhotoSchema(marsh.Schema): 
  uri = marsh.UrlFor('photo', photo_id='<photo_id>', user_id='<user_id>') 
  photo_id = marsh.Int() 
  albums = marsh.Nested(AlbumSchema, many=True) 
  sizes = marsh.Nested(PhotoSizeSchema, many=True) 
  latitude = marsh.Float() 
  longitude = marsh.Float() 
  date = marsh.String() 
####

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
    return [ UserSchema().dump(i) for i in models.User.query.all() ]

  def post(self):
    args = self.reqparse.parse_args()
    user = models.User(args.user_name, args.email)
    # will abort if it fails: 
    insert(user)
    return UserSchema().dump(user), 200
api.add_resource(UserListAPI, '/api/users', endpoint='users')
 
class UserAPI(fr.Resource):
  def get(self, user_id):
    # FIXME:
    user = models.User.query.filter_by(user_id=user_id).one()
    if not user:
        return 'No records found', 404
    return UserSchema().dump(user), 200
api.add_resource(UserAPI, '/api/users/<user_id>', endpoint='user')

class AlbumListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('album_name', type = str, required = True,
      help = "No album name provided")
    super(AlbumListAPI, self).__init__()

  def post(self, user_id):
    """ FIXME: this function needs some sanity checking on
        album name """
    args = self.reqparse.parse_args()
    # FIXME:
    album = models.Album(args.album_name, user_id=user_id)
    # will abort if it fails: 
    insert(album)
    return AlbumSchema().dump(album), 200

  def get(self, user_id):
    # FIXME:
    user = models.User.query.filter_by(user_id=user_id).one()
    if not user:
      return 'user not found', 404
    albums = models.Album.query.filter_by(user_id=user.user_id).all()
    return AlbumSchema(many=True).dump(albums), 200
api.add_resource(AlbumListAPI, '/api/users/<user_id>/albums', endpoint='albums')

 
class AlbumAPI(fr.Resource):
  def get(self, user_id, album_id):
    # FIXME:
    user = models.User.query.filter_by(user_id=user_id).one()
    if not user:
      return 'user not found', 404
    # FIXME:
    album = models.Album.query.filter_by(user_id=user.user_id, album_id=album_id).one()
    if album:
        return AlbumSchema().dump(album), 200
    else:
        return 'No records found', 404
api.add_resource(AlbumAPI, '/api/users/<user_id>/albums/<album_id>', endpoint='album')

class PhotoListAPI(fr.Resource):
  """ photos are at same hierarchic level as albums """

  def get(self, user_id):
    # FIXME:
    user = models.User.query.filter_by(user_id=user_id).one()
    if not user:
      fr.abort(404)
    photos = models.Photo.query.filter_by(user_id=user.user_id).all()
    return PhotoSchema(many=True).dump(photos), 200

  def post(self, user_id):
    """ this route takes a file only -- it gets the relevant
        meta out of it with photo_importer module, 
        puts it into Photo table, puts sizes into Sizes table,
        then saves it to storage -- if all successful, return uri
        so photo can then be added to albums via separate request """
    # FIXME:
    user = models.User.query.filter_by(user_id=user_id).one()
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
        user_id=user.user_id,
        md5sum=jpeg.md5sum,
        date=jpeg.date,
        latitude=jpeg.jpgps.coordinates()[0],
        longitude=jpeg.jpgps.coordinates()[1],
        photo_type=photo_type
        )
      insert(photo)
      # if prior insert was successful, photo.photo_id should
      # be available to use as FK, so insert photo sizes:
      photo_sizes = [] 
      for size in jpeg.sizes:
        photo_size = models.PhotoSize(
          photo_id = photo.photo_id,
          size = size,
          width = jpeg.sizes[size]['width'],
          height = jpeg.sizes[size]['height'],
          name = jpeg.sizes[size]['name']
        )
        insert(photo_size)
        photo_sizes.append(photo_size)
    return PhotoSchema(many=True).dump(photo), 200
api.add_resource(PhotoListAPI, '/api/users/<user_id>/photos', endpoint='photos')

class PhotoAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    #FIXME: append not working:
    self.reqparse.add_argument('album_id', type = int, action="append")
    super(PhotoAPI, self).__init__()


  def put(self, user_id, photo_id):
    """ mostly for adding albums to photo """
    args = self.reqparse.parse_args()
    user = models.User.query.filter_by(user_id=user_id).one()
    photo = models.Photo.query.filter_by(photo_id=photo_id).one()
    if args.album_id:
      for i in args.album_id:
        album = models.Album.query.filter_by(album_id=i).one()
        photo.albums.append(album)
    insert(photo)
    return PhotoSchema().dump(photo), 200

  def get(self, user_id, photo_id):
    user = models.User.query.filter_by(user_id=user_id).one()
    print('this is user: %s' % user)
    photo = models.Photo.query.filter_by(user_id=user.user_id, photo_id=photo_id).one()
    print('this is photo: %s' % photo)
    if not user or not photo:
      fr.abort(404)
    return PhotoSchema().dump(photo), 200
api.add_resource(PhotoAPI, '/api/users/<user_id>/photos/<photo_id>', endpoint='photo')


