function betterResizeImage() {
	var mfp = $.magnificPopup.instance;
	var item = mfp.currItem;
	if(!item || !item.img) return;

	if(mfp.st.image.verticalFit) {
		var decr = 0;
		// fix box-sizing in ie7/8
		if(mfp.isLowIE) {
			decr = parseInt(item.img.css('padding-top'), 10) + parseInt(item.img.css('padding-bottom'),10);
		}
		// set max-height to be relative to viewable area:
		item.img.css('max-height', '85vh');
	}
}
