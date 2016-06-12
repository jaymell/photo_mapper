from flask_marshmallow import Marshmallow
import photo_mapper as pm
from photo_mapper import app

marsh = Marshmallow(app)

#### serialization schema ####

class UserSchema(marsh.Schema):
  uri = marsh.UrlFor('user', user_id='<user_id>')
  user_name = marsh.String()
  user_id = marsh.Int()

class PhotoSizeSchema(marsh.Schema):
  photoSize_id = marsh.Int()
  photo_id = marsh.Int()
  size = marsh.String()
  width = marsh.Int()
  height = marsh.Int()
  name = marsh.Function(lambda x: pm.build_link(x.name))

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
  sizes = marsh.Nested(PhotoSizeSchema, many=True)
  thumbnail = marsh.Function(lambda x: PhotoSchema.get_size(x, 'thumbnail'))
  full = marsh.Function(lambda x: PhotoSchema.get_size(x, 'full'))
  small = marsh.Function(lambda x: PhotoSchema.get_size(x, 'small'))
  scaled = marsh.Function(lambda x: PhotoSchema.get_size(x, 'scaled'))
  md5sum = marsh.String()

  @staticmethod
  def get_size(obj, desired_size):
    """ allow marsh.Function to pass desired size """
    for i in obj.sizes:
      if i.size == desired_size:
        return i.serialize

class AlbumSchema(marsh.Schema):
  uri = marsh.UrlFor('album', album_id='<album_id>', user_id='<user_id>')
  album_id = marsh.Int()
  album_name = marsh.String()
  photos = marsh.Nested(PhotoSchema, many=True, exclude=('albums',))

