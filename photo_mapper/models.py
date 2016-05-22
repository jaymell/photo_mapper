from __future__ import print_function
import flask
from photo_mapper import db

# class names are InitialCaps
# table names are camelCase

class User(db.Model):
  __tablename__  = 'user'
  id = db.Column(db.Integer, primary_key=True)    
  name = db.Column(db.String(64), unique=True)
  email = db.Column(db.String(128), unique=True)

  def __init__(self, name):
    self.name = name
  
class Album(db.Model):
  __tablename__  = 'album'
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(128), unique=True)
  photos = db.relationship('Photo', secondary='albumPhotoLink')

class Photo(db.Model):
  __tablename__  = 'photo'
  id = db.Column(db.Integer, primary_key=True)
  albums = db.relationship('Album', secondary='albumPhotoLink')
  user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
  md5sum = db.Column(db.String(128), unique=True)
  date = db.Column(db.DateTime)
  latitude = db.Column(db.Float)
  longitude = db.Column(db.Float)
  sizes = db.relationship('PhotoSizes', back_populates='photo')
 
class AlbumPhotoLink(db.Model):
  __tablename__  = 'albumPhotoLink'
  album_id = db.Column(db.Integer, db.ForeignKey('album.id'), primary_key=True)
  photo_id = db.Column(db.Integer, db.ForeignKey('photo.id'), primary_key=True)

class PhotoSizes(db.Model):
  __tablename__  = 'photoSizes'
  id = db.Column(db.Integer, primary_key=True)
  photo_id = db.Column(db.ForeignKey('photo.id'))
  photo = db.relationship('Photo', back_populates='sizes')
  size = db.Column(db.String(16))
  width = db.Column(db.Integer)
  height = db.Column(db.Integer)
  # name doesn't need to be stored; it's just a function of md5sum and size

