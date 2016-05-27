from __future__ import print_function
import flask
from photo_mapper import db

# class names are InitialCaps
# table names are camelCase

class User(db.Model):
  __tablename__  = 'user'
  id = db.Column(db.Integer, primary_key=True)    
  user_name = db.Column(db.String(64), unique=True)
  email = db.Column(db.String(128), unique=True)
  albums = db.relationship('Album')

  def __init__(self, user_name, email):
    self.user_name = user_name
    self.email = email

  @property
  def serialize(self):
    return {
        'id': self.id,
        'user_name': self.user_name,
        'email': self.email,
        'albums': [i.album_name for i in self.albums]
    }
  
class Album(db.Model):
  __tablename__  = 'album'
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
  album_name = db.Column(db.String(128), unique=True)
  photos = db.relationship('Photo', secondary='albumPhotoLink')
  __table_args__ = (db.UniqueConstraint('user_id', 'album_name'),)

  def __init__(self, album_name, user_id):
    self.album_name = album_name
    self.user_id = user_id

  @property
  def serialize(self):
    return {
        'id': self.id,
        'name': self.album_name,
        'num_photos': len(self.photos)
    }

class Photo(db.Model):
  __tablename__  = 'photo'
  id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
  albums = db.relationship('Album', secondary='albumPhotoLink')
  md5sum = db.Column(db.String(128), unique=True)
  date = db.Column(db.DateTime)
  latitude = db.Column(db.Float)
  longitude = db.Column(db.Float)
  sizes = db.relationship('PhotoSize', back_populates='photo')
 
class AlbumPhotoLink(db.Model):
  __tablename__  = 'albumPhotoLink'
  album_id = db.Column(db.Integer, db.ForeignKey('album.id'), primary_key=True)
  photo_id = db.Column(db.Integer, db.ForeignKey('photo.id'), primary_key=True)

class PhotoSize(db.Model):
  __tablename__  = 'photoSize'
  id = db.Column(db.Integer, primary_key=True)
  photo_id = db.Column(db.ForeignKey('photo.id'))
  photo = db.relationship('Photo', back_populates='sizes')
  size = db.Column(db.String(16))
  width = db.Column(db.Integer)
  height = db.Column(db.Integer)
  # name doesn't need to be stored; it's just a function of md5sum and size

