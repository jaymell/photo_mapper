from __future__ import print_function
import flask
from photo_mapper import db

# db is coming from main module file:
class User(db.Model):
  __tablename__  = 'User'
  id = db.Column(db.Integer, primary_key=True)    
  name = db.Column(db.String(64), unique=True)
  
class Album(db.Model):
  __tablename__  = 'Album'
  id = db.Column(db.Integer, primary_key=True)
  name = db.Column(db.String(128), unique=True)
  photos = db.relationship('Photo', secondary='AlbumPhotoLink')

class Photo(db.Model):
  __tablename__  = 'Photo'
  id = db.Column(db.Integer, primary_key=True)
  albums = db.relationship('Album', secondary='AlbumPhotoLink')
  user_id = db.Column(db.Integer, db.ForeignKey('User.id'))
  md5sum = db.Column(db.String(128), unique=True)
  date = db.Column(db.DateTime)
  latitude = db.Column(db.Float)
  longitude = db.Column(db.Float)
  sizes = db.relationship('PhotoSizes', back_populates='photo')
 
class AlbumPhotoLink(db.Model):
  __tablename__  = 'AlbumPhotoLink'
  album_id = db.Column(db.Integer, db.ForeignKey('Album.id'), primary_key=True)
  photo_id = db.Column(db.Integer, db.ForeignKey('Photo.id'), primary_key=True)

class PhotoSizes(db.Model):
  __tablename__  = 'PhotoSizes'
  id = db.Column(db.Integer, primary_key=True)
  photo_id = db.Column(db.ForeignKey('Photo.id'))
  photo = db.relationship('Photo', back_populates='sizes')
  size = db.Column(db.String(16))
  width = db.Column(db.Integer)
  height = db.Column(db.Integer)
  # name doesn't need to be stored; it's just a function of md5sum and size

