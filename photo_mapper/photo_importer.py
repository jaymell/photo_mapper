#!/usr/bin/python

import os
import uuid
import datetime
import json
from pymongo import MongoClient
import re
import jpgps
import sys
import hashlib
from PIL import Image
import cStringIO
import shutil
import boto.s3.key

class JpegError(Exception):
	pass

class InsertError(Exception):
	pass

class SaveError(Exception):
	pass

class S3Error(Exception):
	pass

class DBError(Exception):
	pass

class Jpeg:
	""" this class does most of the heavy 
		lifting for imports """

	def __init__(self, f):
		try: 
			# open file and leave it open until
			# explicitly closed:
			self.fh = open(f, 'rb')
		except Exception as e:
			print('Failed to instantiate Jpeg object: %s' % e)
			raise JpegError
		else:
			self.name = self.fh.name
			# is it a bad idea to have 3 separate
			# things reading the fh at once?
			self.md5sum = hashlib.md5(self.fh.read()).hexdigest()
			self.fh.seek(0)
			self.jpgps = jpgps.Jpgps(self.fh)
			self.fh.seek(0)
			self.image = Image.open(self.fh)
			self.fix_orientation()
			self.width, self.height = self.image.size
			self.get_sizes()

	def fix_orientation(self):
		""" rotate image, necessary because PIL
			strips out exif data  """
		rotation = self.jpgps.rotation()
		if rotation:
			self.image = self.image.rotate(rotation, expand=True)

	def get_sizes(self):
		"""	called when class initialized; calculate
			the dimensions for various sizes to be 
			written to storage / recorded in DB """

		SCALED = 1200
		THUMBNAIL = 256
		SMALL = 100
		EXT = '.jpg'

		width = self.width
		height = self.height
		name = self.md5sum

		self.sizes = {
			'full': {
				'width': width,
				'height': height,
				'name': name + EXT
			}
		}
		# scale largest dimension to SCALED px if one
		# of them is larger -- skip 'scaled' altogether if
		# neither larger than SCALED:
		big_dimension = width if width > height else height
		if big_dimension > SCALED:
			self.sizes['scaled'] = {
				'width': int(width * SCALED/float(big_dimension)),
				'height': int(height * SCALED/float(big_dimension)),
				'name': name + '-scaled' + EXT
			}

		# thumbnail scaling:
		self.sizes['thumbnail'] = { 
				'width': int(width * THUMBNAIL/float(big_dimension)),
				'height': int(height * THUMBNAIL/float(big_dimension)),
				'name': name + '-thumbnail' + EXT
		}
		# square images for the list
		self.sizes['small'] =  {
				'width': SMALL,
				'height': SMALL,
				'name': name + '-small' + EXT
		}

	def save(self, location, rotation=True, s3=True):
		""" save to either s3 or disk -- location is either
			folder location (s3==False) or s3 connection (s3==True) """

		QUALITY = 60
		TYPE = 'jpeg'

		#### 
		# save copies based on various dimensions
		#### defined in self.sizes:
		for key, size in self.sizes.items():
			try:
				# save to buffer:
				buf = cStringIO.StringIO()
				if key != 'full':
					resized = self.image.resize((size['width'], size['height']), Image.ANTIALIAS)
					resized.save(buf, TYPE)
				else:
					self.image.save(buf, TYPE)

				if s3:
					self._write_s3(location, buf, size['name'])
				else:
					self._write_fs(location, buf, size['name'])

			except Exception as e:
				raise SaveError('Failed to save: %s' % e)

	def _write_fs(self, location, buf, name):
		""" for writing to file system"""
		
		destination = os.path.join(location,name)
		with open(destination, 'w') as f:
			buf.seek(0)
			shutil.copyfileobj(buf, f)

	def _write_s3(self, bucket, buf, name, content_type='image/jpeg'):
		""" for writing to s3  -- bucket (passed as location) is the return
				val of boto.connect_s3().get_bucket() """

		buf.seek(0)
		k = boto.s3.key.Key(bucket)
		k.key = name
		k.content_type = content_type
		k.set_contents_from_file(buf)

	def db_entry(self, user, album):
		""" build json for db """

		db_entry = {}
		db_entry["user"] = user
		db_entry["album"] = album
		db_entry['md5sum'] = self.md5sum
		db_entry['date'] = self.jpgps.date().strftime('%Y-%m-%d %H:%M:%S') if self.jpgps.date() else None
		db_entry['sizes'] = self.sizes
		db_entry['geojson'] = { "type": "Point", 
								"coordinates": 
									[ self.jpgps.coordinates()[1], 
									 self.jpgps.coordinates()[0] ]
							  }
		return db_entry

	def close(self):
		self.fh.close()


def get_db_duplicates(md5sum, collection, user):
	results = [ i for i in collection.find({'md5sum': md5sum, 'user': user}) ]
	return results

def update_db(db_entry, collection):
	""" write to the database """
	try:
		collection.insert_one(db_entry)
	except Exception as e:
		raise InsertError

if __name__ == '__main__':
	""" this shouldn't be used, but if needed, idea is 
		to do photo import directly on server """
	
	import imghdr
	import ConfigParser

	p = ConfigParser.ConfigParser()
	p.read("config")
	MONGODB_HOST = p.get('DB', 'MONGODB_HOST')
	MONGODB_PORT = p.get('DB', 'MONGODB_PORT')
	DB_NAME = p.get('DB', 'DB_NAME')
	COLLECTION_NAME = p.get('DB', 'COLLECTION_NAME')
	UPLOAD_FOLDER = p.get('STORAGE', 'UPLOAD_FOLDER')
	S3_BUCKET = p.get('STORAGE', 'S3_BUCKET')

	connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
	collection = connection[DB_NAME][COLLECTION_NAME]

	if len(sys.argv) != 2:
		print('Usage: %s <directory name>' % sys.argv[0])
		sys.exit(1)
	location = sys.argv[1]
	user = raw_input('Enter user name: ')
	try:
		dir_items = os.listdir(location)	
	except Exception as e:
		print('Failed to open directory: %s' % e)	
		sys.exit(2)

        """
	##########
	#### not currently working
	##########

	for item in dir_items:
		if not imghdr.what(os.path.join(location,item)) == 'jpeg':
			sys.exit(234)

		try:
			print('Processing %s' % item)
			jpeg = Jpeg(os.path.join(location, item))
		except Exception as e:
			print('Failed to create jpeg object from %s: %s' % (item, e))

		get_db_duplicates(jpeg.md5sum, collection, user)
		if db_dupes:
			print('%s: already in database' % jpeg.name)
			jpeg.close()	

		try:
			update_db(jpeg.db_entry(), collection)
		except InsertError as e:
			print('Failed to update database with %s: %s' % (jpeg.name, e))
			raise

		#jpeg.save(location=)
		#jpeg.close()
        """
