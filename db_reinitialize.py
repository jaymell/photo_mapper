#!/usr/bin/python

import photo_mapper as pm
try: 
  pm.db.engine.execute(
    """
    delete from photoSize;
    delete from photo;
    """
  )
except:
    pass

pm.db.create_all()

