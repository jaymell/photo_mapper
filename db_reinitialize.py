#!/usr/bin/python

import photo_mapper as pm

try: 
  pm.db.engine.execute(
    """
    delete from photoSize;
    delete from albumPhotoLink;
    delete from photo;
    delete from album;
    delete from user;
    """
  )

except Exception as e:
  print("Failed to drop database records: %s" % e)

try: 
  pm.db.create_all()
except Exception as e:
  print("Failed to reinitialize database: %s" % e) 

