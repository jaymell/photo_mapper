from __future__ import print_function
import flask
import flask_restful as fr
from photo_mapper import db, app
import photo_mapper as pm
import passlib.apps
import itsdangerous as itsd
import hashlib

# class names are InitialCaps
# table names are camelCase
# id field names are tablename_id

class Role(db.Model):
  __tablename__ = 'role'
  role_id = db.Column(db.Integer, primary_key=True)
  role_name = db.Column(db.String(64), unique=True)
  users = db.relationship('User', secondary='userRoleLink')

class UserRoleLink(db.Model):
  __tablename__  = 'userRoleLink'
  user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), primary_key=True)
  role_id = db.Column(db.Integer, db.ForeignKey('role.role_id'), primary_key=True)

class User(db.Model):
  __tablename__  = 'user'
  user_id = db.Column(db.Integer, primary_key=True)    
  user_name = db.Column(db.String(64), unique=True)
  email = db.Column(db.String(128), unique=True)
  albums = db.relationship('Album')
  pw_hash = db.Column(db.String(128))
  roles = db.relationship('Role', secondary='userRoleLink')

  def __init__(self, user_name, email):
    self.user_name = user_name
    self.email = email
  
  def hash_pw(self, pw):
    """ hash plaintext password """
    self.pw_hash = passlib.apps.custom_app_context.encrypt(pw)

  def verify_pw(self, pw):
    """ verify pw matches db hash """
    return passlib.apps.custom_app_context.verify(pw, self.pw_hash)

  def generate_token(self, expiration=app.config['TOKEN_LIFE']):
    """ generate sha256 hash of user id """
    token = itsd.TimedJSONWebSignatureSerializer(app.config['SECRET_KEY'], 
                                                 signer_kwargs = {'digest_method': hashlib.sha256}, 
                                                 expires_in = expiration
                                                )
    return token.dumps( { 'user_id': self.user_id } )

  @staticmethod
  def verify_token(token):
    """ verify token can be decrypted, hasn't expired, and corresponds
        to extant user -- static b/c user isn't known yet """
    s = itsd.TimedJSONWebSignatureSerializer(app.config['SECRET_KEY'], signer_kwargs={'digest_method': hashlib.sha256})
    try:
      data = s.loads(token)
    except itsd.BadSignature:
      return None 
    except itsd.SignatureExpired:
      return None
    except Exception as e:
      print(type(e).__name__)
      return None
    user = User.query.get(data['user_id'])
    return user 


class Album(db.Model):
  __tablename__  = 'album'
  album_id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))
  album_name = db.Column(db.String(128))
  global_read = db.Column(db.Boolean, default=False)
  photos = db.relationship('Photo', secondary='albumPhotoLink')
  __table_args__ = (db.UniqueConstraint('user_id', 'album_name'),)

  def __init__(self, album_name, user_id):
    self.album_name = album_name
    self.user_id = user_id

  def global_read(self):
    return self.global_read


class Photo(db.Model):
  __tablename__  = 'photo'
  photo_id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))
  albums = db.relationship('Album', secondary='albumPhotoLink')
  md5sum = db.Column(db.String(32), unique=True)
  photo_type = db.Column(db.String(16))
  date = db.Column(db.DateTime)
  latitude = db.Column(db.Float)
  longitude = db.Column(db.Float)
  sizes = db.relationship('PhotoSize', back_populates='photo')

  def global_read(self):
    """ photo global read is based on 
        being in an album that has global read """
    for album in self.albums:
      if album.global_read: 
        return True
    return False


class AlbumPhotoLink(db.Model):
  __tablename__  = 'albumPhotoLink'
  album_id = db.Column(db.Integer, db.ForeignKey('album.album_id'), primary_key=True)
  photo_id = db.Column(db.Integer, db.ForeignKey('photo.photo_id'), primary_key=True)


class PhotoSize(db.Model):
  __tablename__  = 'photoSize'
  photoSize_id = db.Column(db.Integer, primary_key=True)
  photo_id = db.Column(db.ForeignKey('photo.photo_id'))
  photo = db.relationship('Photo', back_populates='sizes')
  size = db.Column(db.String(16))
  width = db.Column(db.Integer)
  height = db.Column(db.Integer)
  name = db.Column(db.String(64))

  # currently needed so that we can return 
  # individual sizes as attributes of photo:
  @property
  def serialize(self):
    return {
      'height': self.height,
      'width': self.width,
      'size': self.size,
      'name': pm.build_link(self.name),
    }

