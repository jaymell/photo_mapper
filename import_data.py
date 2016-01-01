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
import io

class InsertError(Exception):
	pass

class SaveError(Exception):
	pass

class S3Error(Exception:
	pass

class Jpeg:
	""" this class does most of the heavy 
		lifting for imports -- needs a lot
		of cleanup, error handling, etc. """

	def __init__(self, f):
		# file handle:
		self.fh = open(f, 'rb')
		self.name = self.fh.name
		self.path, self.file_name_orig = os.path.split(self.fh.name)
		self.md5sum = hashlib.md5(self.fh.read()).hexdigest()
		self.file_name_new = str(self.md5sum) + '.jpg'
		self.thumb_name = str(self.md5sum) + '-thumbnail.jpg'
		self.image = Image.open(self.fh)
		width, height = self.image.size
		self.jpgps = jpgps.Jpgps(self.fh)
		self.is_rotated = False

		self.QUALITY = 60
		self.SCALED = 1200
		self.THUMBNAIL = 512
		self.SMALL = 100
		self.EXT = '.jpg'

	def rotate(self):
		""" only do it once """

		if not self.is_rotated:	
			rotation = self.jpgps.rotation()
			if rotation:
				self.image.rotate(self.jpgps.rotation())
		self.is_rotated = True

	def get_sizes(self):
		self.sizes = {
			'full': {
				'width': self.width,
				'height': self.height,
				'name': self.name + self.EXT
			}
		}
		# scale largest dimension to SCALED px if one
		# of them is larger -- skip 'scaled' altogether if
		# neither larger than SCALED:
		big_dimension = width if width > height else height
		if big_dimension > self.SCALED:
			self.sizes['scaled'] = {
				'width': int(width * self.SCALED/float(big_dimension)),
				'height': int(height * self.SCALED/float(big_dimension)),
				'name': self.name + '-scaled' + self.EXT
			}

		# thumbnail scaling:
		self.sizes['thumbnail'] = { 
				'width': int(width * self.THUMBNAIL/float(big_dimension)),
				'height': int(height * self.THUMBNAIL/float(big_dimension)),
				'name': self.name + '-thumbnail' + self.EXT
		}
		self.sizes['small'] =  {
				'width': self.SMALL,
				'height': self.SMALL,
				'name': self.name + '-small' + self.EXT
			}


	def resize(self, width, height, *options):
		""" doesn't actually save it, returns
			a new resized image """

		print('Saving dimensions: %s\t%s' % (self.height, self.width)
		resized = self.image.resize((width, height)), Image.ANTIALIAS)
		return resized	

	def save_file(self, folder, rotation=True):
		if rotation:
			self.rotate()

		for key, size in self.sizes.items():
			try:
				destination = os.path.join(folder,size['name'])
				print('Saving %s... ' % destination)
				if key == 'full':
					img.save(destination, self.TYPE)
				else:
					resized = self.resize((size['width'], size['height']), Image.ANTIALIAS)
					resized.save(destination, self.TYPE, quality=self.QUALITY)
			except Exception as e:
				raise SaveError('Failed to save %s: %s' % (destination, e))

	def save_s3(self, bucket, rotation=True, connection):
		if rotation:
			self.rotate()
				
        for key, size in self.sizes.items():
			try:
				self.fh.seek(0)
				connection.upload(self.name, self.fh)
			except Exception as e:
				raise S3Error('Error uploading: %s' % e)
				
	def db_entry(self, user):
		""" build json for db """

		db_entry = {}
		db_entry["user"] = user
		db_entry['md5sum'] = self.md5sum
		db_entry['date'] = self.jpgps.date().strftime('%Y-%m-%d %H:%M:%S') if self.jpgps.date() else None
		db_entry['geojson'] = { "type": "Point", 
								"coordinates": [self.jpgps.coordinates()[1], 
									self.jpgps.coordinates()[0]]}

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

def process(jpeg, collection, user):
	""" handle checking for duplicates and writes to
		FS and database """

	write_file_only = False

	db_dupes = get_db_duplicates(jpeg.md5sum, collection, user)
	if db_dupes:
		if len(db_dupes) > 1:
			print('Multiple DB duplicates found. Exiting: ', jpeg.file_name_orig)
			sys.exit(3)
		else:
			# if there's a single duplicate and the image already exists, skip it:
			if os.path.exists(os.path.join(PHOTO_FOLDER,jpeg.file_name_new)):
				print('Duplicate found. Skipping: ', jpeg.file_name_orig)
			# there's already a db entry but the image was deleted, just copy the image:
			else:
				print('DB entry found but file is missing... copying file')
				write_file_only = True	

	# write file:
	try:
		jpeg.save()
	except Exception as e:
		print('Failed to write image to file system: %s' % e)
		jpeg.close()
		return
	

	# write json for each of the different sizes availabe
	# for each image:
	db_entry['sizes'] = {}
	for key, size in sizes.items():
		db_entry['sizes'][key] = {'height': size['height'], 'width': size['width'], 'name': size['name']}

	# db update:
	if not write_file_only:
		try:
			update_db(db_entry, collection)
		except InsertError as e:
			print('Failed to update database with %s: %s' % (jpeg.file_name_orig, e))

	jpeg.close()
	
if __name__ == '__main__':

	import imghdr
	import ConfigParser

	p = ConfigParser.ConfigParser()
	p.read("config")
	MONGODB_HOST = p.get('DB', 'MONGODB_HOST')
	MONGODB_PORT = p.get('DB', 'MONGODB_PORT')
	DB_NAME = p.get('DB', 'DB_NAME')
	COLLECTION_NAME = p.get('DB', 'COLLECTION_NAME')
	PHOTO_FOLDER = p.get('STORAGE', 'PHOTO_FOLDER')
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
	for item in dir_items:
		if imghdr.what(os.path.join(location,item)) == 'jpeg':
			try:
				jpeg = Jpeg(os.path.join(location, item))
			except Exception as e:
				print('Failed to create jpeg object from %s: %s' % (item, e))
			else:
				print('Original File Name: %s' % jpeg.file_name_orig)
				try:
					process(jpeg, collection, user)
				finally:
					jpeg.close()
