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

def get_or_404(model, obj_id, code=404):
  obj = model.query.get(obj_id)
  if obj is None:
    fr.abort(404)
  return obj

def insert_or_fail(record):
    """ insert record or abort """
    try:
      db.session.add(record)
      db.session.commit()
    except fsql.sqlalchemy.exc.IntegrityError as e:
      # is there a better way to do this?
      if "Duplicate entry" in str(e):
        print("Duplicate entry")
        fr.abort(409)
      else:
        raise e
    except Exception as e:
      print("Unknown error: %s" % e)
      fr.abort(400)

#### serialization schema
class UserSchema(marsh.Schema):
  uri = marsh.UrlFor('user', user_id='<user_id>')
  user_name = marsh.String()

class PhotoSizeSchema(marsh.Schema): 
  photoSize_id = marsh.Int() 
  photo_id = marsh.Int() 
  size = marsh.String() 
  width = marsh.Int() 
  height = marsh.Int() 
  name = marsh.Function(lambda x: pm.build_link(x.name)) 
 
def get_size(obj, desired_size):
  """ allow marsh.Function to pass desired size """
  for i in obj.sizes:
    if i.size == desired_size:
      return i.serialize
 
class PhotoSchema(marsh.Schema): 
  uri = marsh.UrlFor('photo', photo_id='<photo_id>', user_id='<user_id>') 
  photo_id = marsh.Int() 
  latitude = marsh.Float() 
  longitude = marsh.Float() 
  date = marsh.String() 
  albums = marsh.Nested('AlbumSchema', many=True, only=('album_id',))
  # for getting individual sizes -- may be better way to do this, but
  # this is the first working way I've found to get sizes as attributes
  # of photo rather than just an unordered list of sizes that requires iteration:
  #sizes = marsh.Nested(PhotoSizeSchema, many=True) 
  thumbnail = marsh.Function(lambda x: get_size(x, 'thumbnail'))
  full = marsh.Function(lambda x: get_size(x, 'full'))
  small = marsh.Function(lambda x: get_size(x, 'small'))
  scaled = marsh.Function(lambda x: get_size(x, 'scaled'))

class AlbumSchema(marsh.Schema): 
  uri = marsh.UrlFor('album', album_id='<album_id>', user_id='<user_id>')
  album_id = marsh.Int() 
  album_name = marsh.String() 
  photos = marsh.Nested(PhotoSchema, many=True, exclude=('albums',))
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
    users = models.User.query.all()
    return UserSchema(many=True).dump(users).data, 200

  def post(self):
    args = self.reqparse.parse_args()
    user = models.User(args.user_name, args.email)
    # will abort if it fails: 
    insert_or_fail(user)
    return UserSchema().dump(user).data, 200
api.add_resource(UserListAPI, '/api/users', endpoint='users')
 
class UserAPI(fr.Resource):
  def get(self, user_id):
    user = get_or_404(models.User, user_id)
    return UserSchema().dump(user).data, 200
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
    insert_or_fail(album)
    return AlbumSchema().dump(album).data, 200

  def get(self, user_id):
    user = get_or_404(models.User, user_id)
    albums = models.Album.query.filter_by(user_id=user.user_id).all()
    return AlbumSchema(many=True).dump(albums).data, 200
api.add_resource(AlbumListAPI, '/api/users/<user_id>/albums', endpoint='albums')

 
class AlbumAPI(fr.Resource):
  def get(self, user_id, album_id):
    user = get_or_404(models.User, user_id)
    # FIXME:
    album = models.Album.query.filter_by(user_id=user.user_id, album_id=album_id).one()
    if album:
        return AlbumSchema().dump(album).data, 200
    else:
        return 'No records found', 404
api.add_resource(AlbumAPI, '/api/users/<user_id>/albums/<album_id>', endpoint='album')

class PhotoListAPI(fr.Resource):
  """ photos are at same hierarchic level as albums """

  def get(self, user_id):
    user = get_or_404(models.User, user_id)
    photos = models.Photo.query.filter_by(user_id=user.user_id).all()
    return PhotoSchema(many=True).dump(photos).data, 200

  def post(self, user_id):
    """ this route takes a file only -- it gets the relevant
        meta out of it with photo_importer module, 
        puts it into Photo table, puts sizes into Sizes table,
        then saves it to storage -- if all successful, return uri
        so photo can then be added to albums via separate request """
    user = get_or_404(models.User, user_id)
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
      photo = models.Photo(
        user_id=user.user_id,
        md5sum=jpeg.md5sum,
        date=jpeg.date,
        latitude=jpeg.jpgps.coordinates()[0],
        longitude=jpeg.jpgps.coordinates()[1],
        photo_type=photo_type
        )
      insert_or_fail(photo)
      # if prior insert was successful, photo.photo_id should
      # be available to use as FK, so insert photo sizes:
      for size in jpeg.sizes:
        photo_size = models.PhotoSize(
          photo_id = photo.photo_id,
          size = size,
          width = jpeg.sizes[size]['width'],
          height = jpeg.sizes[size]['height'],
          name = jpeg.sizes[size]['name']
        )
        insert_or_fail(photo_size)
    return PhotoSchema().dump(photo).data, 200
api.add_resource(PhotoListAPI, '/api/users/<user_id>/photos', endpoint='photos')

class PhotoAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('album_id', type=int, action="append")
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
    insert_or_fail(photo)
    return PhotoSchema().dump(photo).data, 200

  def get(self, user_id, photo_id):
    user = models.User.query.filter_by(user_id=user_id).one()
    print('this is user: %s' % user)
    photo = models.Photo.query.filter_by(user_id=user.user_id, photo_id=photo_id).one()
    print('this is photo: %s' % photo)
    if not user or not photo:
      fr.abort(404)
    return PhotoSchema().dump(photo).data, 200
api.add_resource(PhotoAPI, '/api/users/<user_id>/photos/<photo_id>', endpoint='photo')


