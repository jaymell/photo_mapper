#!/usr/bin/python

import os
import uuid
import datetime
import dateutil.tz
import json
from pymongo import MongoClient
import re
import jpgps
import sys
import hashlib


class Jpeg:
	""" quick n dirty way to get extra
		attributes along with file handle """

	def __init__(self, f):
		self.fh = open(f, 'rb')
		self.name = self.fh.name
		self.file_name_orig, self.path = os.path.split(self.fh.name)
		self.md5sum = hashlib.md5(self.fh.read()).hexdigest()
		self.file_name_new = str(self.md5sum) + '.jpg'
	def close(self):
		self.fh.close()

def get_db_duplicates(md5sum, collection):
	results = [ i for i in collection.find({'md5sum': md5sum}) ]
	return results

def process(jpeg, collection):
	""" figure out whether it's a db duplicate; act
		accordingly """

	db_dupes = get_db_duplicates(jpeg.md5sum, collection)
	if db_dupes:
		if len(db_dupes) > 1:
			print('Multiple DB duplicates found. Exiting: ', jpeg.file_name_orig)
			sys.exit(3)
		elif os.path.exists(os.path.join(PHOTO_FOLDER,jpeg.file_name_new)):
			print('Duplicate found. Skipping: ', jpeg.file_name_orig)
			return

	# try to update database AND
	# put files in right place; if one
	# fails, undo the other:	
	try:
		jpeg.fh.seek(0)
		db_entry = jpgps.Jpgps(jpeg.fh).as_dict()
	except Exception as e:
		print('Failed to instantiate Jpgps object for %s: %s' % (jpeg.file_name_orig, e))
		return

	# add the md5sum and file_name_new from jpeg to the gps data to be inserted:
	db_entry['md5sum'] = jpeg.md5sum
	db_entry['file_name'] = jpeg.file_name_new

	try:
		collection.insert_one(db_entry)
	except Exception as e:
		print('Failed to update database with %s: %s' % (jpeg.file_name_orig, e))
		return
	else:
		# write file:
		try:
			with open(os.path.join(PHOTO_FOLDER, jpeg.file_name_new), 'wb') as f:
				jpeg.fh.seek(0)
				f.write(jpeg.fh.read())
		except Exception as e:
			# if write failed, try to remove DB entry just added:
			try:
				collection.remove(db_entry)
			except Exception as e:
				print('Failed to remove item from database -- db is no longer consistent w/ file system: %s' % e)
				sys.exit(4)
		finally:
			jpeg.close()
	
if __name__ == '__main__':

	MONGODB_HOST = 'localhost'
	MONGODB_PORT = 27017
	DB_NAME = 'photo_mapper'
	COLLECTION_NAME='photo_mapper'
	PHOTO_FOLDER = './public/img'
	connection = MongoClient(MONGODB_HOST, MONGODB_PORT)
	collection = connection[DB_NAME][COLLECTION_NAME]

	if len(sys.argv) != 2:
		print('Usage: %s <directory name>' % sys.argv[0])
		sys.exit(1)
	location = sys.argv[1]
	try:
		dir_items = os.listdir(location)	
	except Exception as e:
		print('Failed to open directory: %s' % e)	
		sys.exit(2)
	for item in dir_items:
		# is there better way to discern jpeg-edness?
		# furthermore, TIFFs are also theoretically possible
		if item[-3:].lower() == 'jpg' or item[-4:].lower() == 'jpeg':
			try:
				jpeg = Jpeg(os.path.join(location, item))
			except Exception as e:
				print('Failed to create jpeg object from %s: %s' % (item, e))
			else:
				print('FILE NAME: %s' % jpeg.file_name_orig)
				try:
					process(jpeg, collection)
				finally:
					jpeg.close()


