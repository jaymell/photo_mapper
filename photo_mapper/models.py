from __future__ import print_function
import flask
import flask_restful as fr
from photo_mapper import db, app

# class names are InitialCaps
# table names are camelCase
# id field names are tablename_id

class User(db.Model):
  __tablename__  = 'user'
  user_id = db.Column(db.Integer, primary_key=True)    
  user_name = db.Column(db.String(64), unique=True)
  email = db.Column(db.String(128), unique=True)
  albums = db.relationship('Album')

  def __init__(self, user_name, email):
    self.user_name = user_name
    self.email = email

class Album(db.Model):
  __tablename__  = 'album'
  album_id = db.Column(db.Integer, primary_key=True)
  user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'))
  album_name = db.Column(db.String(128), unique=True)
  photos = db.relationship('Photo', secondary='albumPhotoLink')
  __table_args__ = (db.UniqueConstraint('user_id', 'album_name'),)

  def __init__(self, album_name, user_id):
    self.album_name = album_name
    self.user_id = user_id

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


