from __future__ import print_function
import collections as col
import functools as ft
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
from flask.ext.httpauth import HTTPBasicAuth
import schema
import flask.ext.principal as pr

api = fr.Api(app)
auth = HTTPBasicAuth()

# currently the only thing flask principal is used for:
AdminPermission = pr.Permission(pr.RoleNeed('Administrator'))

@pr.identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
  """ when id loaded, add user's permissions to the global
      identity; currently this is only adding roles since 
      permissions to most things is currently just a matter of matching
      user id """
  print("on_identity_changed called")
  identity.user = flask.g.user
  # is there an 'else' to this if? anonymous user?
  if hasattr(identity.user, 'user_id'):
    for role in identity.user.roles:
      # consider role_id instead of role_name?
      print("user: %s, role: %s" % (flask.g.user.user_name, role.role_name)) 
      identity.provides.add(pr.RoleNeed(role.role_name))
  else:
    print("no user id")
    fr.abort(500)
  flask.g.identity = identity
  print(identity)
  
def valid_pw(pw1, pw2):
  """ TODO: add minimum password requirements here""" 

  if pw1 != pw2:
    print('not valid password')
    return False

  return True

@auth.verify_password
def verify_pw(user_or_token, pw):
  """ try token auth, if fails try to verify as pw (plaintext) 
      against pw hash in db """

  print("verify_pw called")
  # assume it's a token first:
  try:
    user = models.User.verify_token(user_or_token)
  except Exception as e:
    print("Failed on User.verify_token: %s" % e)
    fr.abort(500)
  if not user:
    # try password auth if token failed:
    user = models.User.query.filter_by(user_name = user_or_token).one_or_none()
    if not user or not user.verify_pw(pw):
      return False

  flask.g.user = user
  
  pr.identity_loaded.send(
    flask.current_app._get_current_object(), 
    identity = pr.Identity(user.user_id)
  )
  return True

def get_or_404(model, **kwargs):
  """ expects to be passed arguments to query.filter_by and return record or 404 """
  try: 
    obj = model.query.filter_by(**kwargs).one_or_none()
  except Exception as e:
    print('Error in get_or_404: %s' % e)
    fr.abort(500)
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
      print('Unknown IntegrityError: %s' % e)
      fr.abort(500)
  except Exception as e:
    print("Unknown error: %s" % e)
    fr.abort(400)

def is_authenticated_user(user_id):
  if unicode(flask.g.user.user_id) == unicode(user_id):
    return True
  return False

class UserListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('user_name', type = str, required = True,
      help = "No username provided")
    self.reqparse.add_argument('email', type = str, required = True,
      help = "No email provided")
    self.reqparse.add_argument('password1', type = str, required = True,
      help = "Missing password1")
    self.reqparse.add_argument('password2', type = str, required = True,
      help = "Missing password2")
    super(UserListAPI, self).__init__()
  @auth.login_required
  def get(self):
    if not AdminPermission.can():
      fr.abort(403)
    users = models.User.query.all()
    return schema.UserSchema(many=True).dump(users).data, 200
  @auth.login_required
  # TODO: how authenticate this method, given that if creating
  # user account, user won't yet exist?
  def post(self):
    args = self.reqparse.parse_args()
    if not valid_pw(args.password1, args.password2):
      abort(400)
    user = models.User(args.user_name, args.email)
    user.hash_pw(args.password1)
    insert_or_fail(user)
    return schema.UserSchema().dump(user).data, 200
api.add_resource(UserListAPI, '/api/users', endpoint='users')
 
class UserAPI(fr.Resource):
  @auth.login_required
  def get(self, user_id):
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    user = get_or_404(models.User, user_id=user_id)
    return schema.UserSchema().dump(user).data, 200
api.add_resource(UserAPI, '/api/users/<user_id>', endpoint='user')

class AlbumListAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('album_name', type = str, required = True,
      help = "No album name provided")
    super(AlbumListAPI, self).__init__()

  @auth.login_required
  # TODO: test authentication
  def post(self, user_id):
    """ FIXME: this function needs some sanity checking on
        album name """
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    args = self.reqparse.parse_args()
    album = models.Album(args.album_name, user_id=user_id)
    # will abort if it fails: 
    insert_or_fail(album)
    return schema.AlbumSchema().dump(album).data, 200

  @auth.login_required
  # TODO: test authentication
  def get(self, user_id):
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    user = get_or_404(models.User, user_id=user_id)
    albums = models.Album.query.filter_by(user_id=user.user_id).all()
    return schema.AlbumSchema(many=True).dump(albums).data, 200
api.add_resource(AlbumListAPI, '/api/users/<user_id>/albums', endpoint='albums')

class AlbumAPI(fr.Resource):
  @auth.login_required
  def get(self, user_id, album_id):
    print("AlbumAPI.get called")
    # XXX: would be ideal to get user/album _after_ authentication but don't think it's
    # possible given that album itself's characteristics can grant permission:
    user = get_or_404(models.User, user_id=user_id)
    album = get_or_404(models.Album, user_id=user.user_id, album_id=album_id)
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass 
    elif album.global_read():
      pass
    else:
      fr.abort(403) 
    return schema.AlbumSchema().dump(album).data, 200
api.add_resource(AlbumAPI, '/api/users/<user_id>/albums/<album_id>', endpoint='album')

class PhotoListAPI(fr.Resource):
  """ photos are at same hierarchic level as albums """

  @auth.login_required
  # TODO: test authentication
  def get(self, user_id):
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    user = get_or_404(models.User, user_id=user_id)
    photos = models.Photo.query.filter_by(user_id=user.user_id).all()
    return schema.PhotoSchema(many=True).dump(photos).data, 200

  @auth.login_required
  # TODO: test authentication
  def post(self, user_id):
    """ this route takes a file only -- it gets the relevant
        meta out of it with photo_importer module, 
        puts it into Photo table, puts sizes into Sizes table,
        then saves it to storage -- if all successful, return uri
        so photo can then be added to albums via separate request """
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    user = get_or_404(models.User, user_id=user_id)
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
    return schema.PhotoSchema().dump(photo).data, 200
api.add_resource(PhotoListAPI, '/api/users/<user_id>/photos', endpoint='photos')

class PhotoAPI(fr.Resource):
  def __init__(self):
    self.reqparse = reqparse.RequestParser()
    self.reqparse.add_argument('album_id', type=int, action="append")
    super(PhotoAPI, self).__init__()

  @auth.login_required
  # TODO: test auth
  def put(self, user_id, photo_id):
    """ add photo to albums """
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass
    else:
      fr.abort(403)
    args = self.reqparse.parse_args()
    user = get_or_404(models.User, user_id=user_id)
    photo = get_or_404(models.Photo, user_id=user_id, photo_id=photo_id)
    if args.album_id:
      for i in args.album_id:
        album = models.Album.query.filter_by(album_id=i).one()
        photo.albums.append(album)
    insert_or_fail(photo)
    return schema.PhotoSchema().dump(photo).data, 200

  @auth.login_required
  # TODO: test auth
  def get(self, user_id, photo_id):
    user = models.User.query.filter_by(user_id=user_id).one()
    photo = get_or_404(models.Photo, user_id=user_id, photo_id=photo_id)
    if is_authenticated_user(user_id):
      pass
    elif AdminPermission.can():
      pass 
    elif photo.global_read():
      pass
    else:
      fr.abort(403) 
    return schema.PhotoSchema().dump(photo).data, 200
api.add_resource(PhotoAPI, '/api/users/<user_id>/photos/<photo_id>', endpoint='photo')

class TokenAPI(fr.Resource):
  """ for getting tokens once basic auth done"""

  @auth.login_required
  def get(self):
    try: 
      token = flask.g.user.generate_token()
    except Exception as e:
      print('error generating token: %s' % e)
      fr.abort(500)
    return { 'token': token }
api.add_resource(TokenAPI, '/api/token')

