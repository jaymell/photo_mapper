## Photo Mapper
Put pictures in a database on a map. Images displayed using Magnific Popup JS library

To do:
* Make map marker clicks gallery style?
  * If so, need to try to tie initialization to markerObj, not individual markers
* Possibly set onClicks for arrows and use next()/prev() methods rather than elementParse callback
* Center on selected pin when choosing picture on left,
if applicable
  * This tends to not be helpful in practice... 
just confusing
* Remove photos that suck
* Improve pin jittering
* Animate scrolling to selected item in list
  * Done, though lags on fast gallery scrolling
* Try to add stuff to map that's not actually geo-tagged based on time
* Album label in heading
* User accounts
* Set map labels on by default
* Look decent on phone
* Server-side image rotation
  * Done!
