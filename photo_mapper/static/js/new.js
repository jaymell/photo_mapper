// handle events when markers or photoList are clicked,
// or when scrolling happens within photoSwipe:
var photoEvents = $.Callbacks();
// handle events for clicking on map button that
// shows in photoswipe display for geo-tagged photos;
// handled separately b/c I only want auto-zoom ( and 
// maybe center) to happen in this case:
var photoSwipeMapButtonEvents = $.Callbacks();

// pass it the name of the container div and the
// item div you want to move to top of list:
var scrollToSelected = function($ctDiv, $itDiv) {
  var scrollSpeed = 250;
  // portrait
  if (window.orientation == 0 || window.innerHeight > window.innerWidth ) {
        $ctDiv.animate({
           scrollLeft: $itDiv.offset().left 
            + $ctDiv.scrollLeft() 
            - $ctDiv.offset().left
        }, scrollSpeed);
  // landscape
  } else {
       $ctDiv.animate({ 
      scrollTop: $itDiv.offset().top 
            + $ctDiv.scrollTop() 
            - $ctDiv.offset().top
       }, scrollSpeed);
  }
};


function setPinColor(pinColor) {
// you want to append one of the above colors to this url:
  var pinLink = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"
  return new google.maps.MarkerImage(
    pinLink + pinColor,
    new google.maps.Size(21, 34),
    new google.maps.Point(0,0),
    new google.maps.Point(10, 34)
  );
};


class MapContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {activePhoto: null};
  }

  updateMap(photo) {
    this.setState({activePhoto: photo})
  }

  componentWillMount() {
    photoEvents.add(this.updateMap.bind(this));
  }

  render() {
    if (this.props.mapIsVisible) {
      return (
        <Map activePhoto={this.state.activePhoto} mapCanvas={this.refs.mapCanvas} data={this.props.data}></Map>
      );
    }
    return null;
  }
}


class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = { initialized: false, map: null };
  }

  // hackish way to avoid having to pass around
  // more state just to zoom on the marker:
  handlePhotoSwipeMapButton(id) {
    let locale = null;
    for(let i=0; i<this.props.data.length; i++) {
      let item = this.props.data[i];
      if(item.md5sum == id) {
        locale = new google.maps.LatLng(item.latitude, item.longitude);
      }
    }
    if (locale) {
      this.state.map.setCenter(locale);
      if (this.state.map.getZoom() < 18 ) {
        this.state.map.setZoom(18);
      }      
    }
  }

  initialize() {
    let locale = new google.maps.LatLng(30,0);
    let mapOptions = {
      center: locale,
      zoom: 4,
      minZoom: 2,
      keyboardShortcuts: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };
    photoSwipeMapButtonEvents.add(this.handlePhotoSwipeMapButton.bind(this));
    this.setState({ 
      map: new google.maps.Map(this.refs.mapCanvas, mapOptions), 
      initialized: true 
    });
  }

  componentDidMount() {
    if (!this.state.initialized) {
      console.log('initializing');
      this.initialize();
    }
  }

  render() {
    var markers = this.props.data.map(function(p, i) {
      // only render marker if it actually has coordinates:
      if (p.longitude && p.latitude) {
        return (
          <Marker activePhoto={this.props.activePhoto} map={this.state.map} photo={p} key={p.md5sum}></Marker>
        );
      }
    }.bind(this));

    return (
      <div>
        <div className="mapCanvas" ref="mapCanvas"></div>
        {markers}
      </div>

    );
  }
}


class Marker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {initialized: false};
    this.basePin = setPinColor('FE7569');
    this.changedPin = setPinColor('8169fe');
  }

  changePin() {
    // change pin color
    this.marker.setIcon(this.changedPin);
  }

  onClick() {
    photoEvents.fire(this.props.photo.md5sum);
  }

  initialize() {
    console.log('adding pin');
    let map = this.props.map;
    let photo = this.props.photo;
    let longitude = photo.longitude;
    var latitude = photo.latitude;
    this.marker = new google.maps.Marker({
      position: new google.maps.LatLng(
        latitude,
        longitude
      ),
      title: photo.date,
      map: map,
      icon: this.basePin,
      md5sum: photo.md5sum,
      changePin: function() {
        this.setIcon(this.changedPin);
      }
    });
    this.marker.addListener('click', this.onClick.bind(this));
    this.setState({initialized: true});
  }

  // shouldComponentUpdate(nextProps, nextState) {
  //   return this.props.value !== nextProps.value;
  // }

  componentDidUpdate(prevProps) {
    if (this.props.map) {
      if (!this.state.initialized) {
        this.initialize()
      }
    }
    if (this.props.activePhoto == this.props.photo.md5sum) {
      this.changePin();
    }
  }

  render() {
    return null;
  }
}


class PhotoList extends React.Component {
  constructor(props) {
    super(props);
  }

  handleEvent(e) {
    scrollToSelected($('.photoList'), $('#'+e));
  }

  componentWillMount() {
    photoEvents.add(this.handleEvent.bind(this));
  }

  onPhotoClick(photoId) {
    photoEvents.fire(photoId);
  }

  render() {
    var Photos = this.props.data.map(function(p) {
      return (
        <Photo onPhotoClick={this.onPhotoClick} photo={p} key={p.md5sum} size={this.props.photoSize}></Photo>
      );
    }.bind(this));

    return (
      <div className="photoList">
        {Photos}
      </div>
    );
  }
}


class Photo extends React.Component {
  constructor(props) {
    super(props);
  }

  _onClick() {
    this.props.onPhotoClick(this.props.photo.md5sum);
  }

  render() {
    let photo = this.props.photo[this.props.size];
    return (
      <div className="listItem" id={this.props.photo.md5sum} >
          <img onClick={this._onClick.bind(this)} 
               className="thumbnail" 
               src={photo.name}
               // height={photo.height < photo.width ? (photo.height + photo.height/3) : photo.height} 
               // width={photo.height < photo.width ? (photo.width + photo.width/3) : photo.width} 
               height={photo.height}
               width={photo.width}
            >
          </img>
      </div>
    );
  }
}


class PhotoSwipeContainer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {isOpen: false}
  }

  componentDidMount() {
    // build photoArray for photoSwipe:
    this.photoArray = this.props.data.map(function(p, i) {
      return { 
        id: p.md5sum,
        index: i,
        full: p.full,
        scaled: p.scaled,
        // is geo-tagged? true or false:
        geo: (p.latitude && p.longitude) ? true : false 
      };
    });
    // subscribe to events:
    photoEvents.add(this.handleEvent.bind(this));
  }

  handleClose() {
    this.setState({isOpen: false})
  }

  handleEvent(e) {
    var curPhoto = this.photoArray.find(function(photo) {
      return photo.id == e;
    });
    if (this.state.isOpen === false) {
      this.setState({isOpen: true}, function() {
        openPhotoSwipe(this.photoArray, curPhoto.index, this.handleClose.bind(this));  
      }.bind(this));
    }
  }

  render() {
    return null;
  }
}


class NavBar extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <nav className="navbar navbar-default navbar-fixed-top navbar-light bg-faded">
        <Logo src="/static/lib/img/logo.png" width="35px" height="50px" />
        <MapToggler toggleMap={this.props.toggleMap} />
      </nav>
    );
  }
}

class Logo extends React.Component {
  constructor(props) {
    super(props);
  }  

  render() {
    return (
        <img className="img-thumbnail logo" src={this.props.src} width={this.props.width} height={this.props.height} ></img>
    )
  }
}


class MapToggler extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <button onClick={this.props.toggleMap} className="mapToggler btn btn-default" type="button">Toggle Map</button>
    );
  }
}


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: null , url: this.props.url, mapIsVisible: false, photoSize: 'thumbnail' };
    this.mediaquery = window.matchMedia("(orientation:landscape)");
  }

  // sort array by date
  // prior to setting state
  initData(data) {
    let sorted = data.sort(function(a,b) {
      return new Date(a.date) - new Date(b.date);
    });
    this.setState({ data: sorted });    
  }

  poll() {
    if (this.state.url) {
      $.ajax({
        type: 'GET',
        url: this.state.url,
        dataType: 'json',
        cache: false,
        beforeSend: function(xhr) {
            xhr.setRequestHeader("Authorization", "Basic " + btoa("eyJhbGciOiJIUzI1NiIsImV4cCI6MjQ4MTQwNTQzNCwiaWF0IjoxNDgxNDA1NDM1fQ.eyJ1c2VyX2lkIjo4fQ.QJgTpuHlzMgJ9eq7YA_ZSIntduv8daEkJE-bCr-za8Y:"))
        },
        success: function(data) {
          this.initData(data);
        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.state.url, status, err.toString());
        }.bind(this)
      });
    }
  }

  setUrl(url) {
    this.setState({ url: url })
  }

  // media query change
  orientationChange(mq) {
    if (mq.matches) {
      // landscape
      console.log('matches landscape');
      $('.photoList').css({
        'float': 'left',
        'height': '100%',
        // 'margin-left': '1%',
        'overflow': 'auto',
        'width': '130px',
        'white-space': 'normal'
      });
    } else {
      // portrait
      console.log('matches portrait');
      $('.photoList').css({
        'float': 'none',
        'overflow-x': 'scroll',
        'overflow-y': 'hidden',
        'overflow': 'auto',
        'width': 'auto',
        'height': 'auto',
        'white-space': 'nowrap'
      });
    }
  }


  toggleMap() {
    if ( this.state.mapIsVisible ) {
      console.log('toggleMap triggered -- turning map OFF');
      this.setState({mapIsVisible: false })
      this.setState({photoSize: 'thumbnail'})
      this.mediaquery.removeListener(this.orientationChange);
      // and actually remove any previous styles:
      $('.photoList').css({
        'overflow': 'auto',
        'overflow-x': 'visible',
        'overflow-y': 'visible',
        'width': 'auto',
        'height': 'auto',
        'white-space': 'normal'
      });      
    }
    else {
      console.log('toggleMap triggered -- turning map ON');
      this.setState({mapIsVisible: true })
      this.setState({photoSize: 'small'})
      this.orientationChange(this.mediaquery);
      this.mediaquery.addListener(this.orientationChange);
    }

  }

  startPolling() {
    console.log('starting polling')
    setInterval(this.poll.bind(this), this.props.pollInterval);
  }

  componentDidMount() {
    this.poll();
    this.startPolling();
  }
    
  render() {
    if (!this.state.data) return ( <div><b>Loading ...</b></div> )
    else { 
      return (
        <div>
          <NavBar toggleMap={this.toggleMap.bind(this)} />
          <PhotoList ref="photoList" data={this.state.data} photoSize={this.state.photoSize} />
          <MapContainer data={this.state.data} mapIsVisible={this.state.mapIsVisible} />
          <PhotoSwipeContainer data={this.state.data} />
        </div>
      );
    }
  }
}


ReactDOM.render(
  <App url="/api/users/8/photos" pollInterval="1800000"/>,
  document.getElementById('content')
);


// append requisite html for photoSwipe:
var html = ' \
<div class="pswp" tabindex="-1" role="dialog" aria-hidden="true"> \
<div class="pswp__bg"></div>    \
<div class="pswp__scroll-wrap">  \
  <div class="pswp__container"> \
    <div class="pswp__item"></div> \
    <div class="pswp__item"></div> \
    <div class="pswp__item"></div> \
  </div> \
  <div class="pswp__ui pswp__ui--hidden"> \
    <div class="pswp__top-bar"> \
      <div class="pswp__counter"></div> \
      <button class="pswp__button pswp__button--close" title="Close (Esc)"></button> \
      <button class="pswp__button pswp__button--share" title="Share"></button> \
      <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button> \
      <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button> \
      <img class="pswp__button pswp__button--mapIt" title="Show on map" src="/static/lib/img/map.png"></button> \
      <div class="pswp__preloader"> \
        <div class="pswp__preloader__icn"> \
          <div class="pswp__preloader__cut"> \
            <div class="pswp__preloader__donut"></div> \
          </div> \
        </div> \
      </div> \
    </div> \
    <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap"> \
      <div class="pswp__share-tooltip"></div> \
    </div> \
    <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></button> \
    <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></button> \
    <div class="pswp__caption"> \
      <div class="pswp__caption__center"></div> \
    </div> \
  </div> \
</div> \
</div>';


$(document.body).append(html);


// detect orientation change and make sure list
// stays in proper location:
$(window).on('orientationchange', function() {
  var offset = {
      scrollTop: $('#mapLeft').scrollTop(),
      scrollLeft: $('#mapLeft').scrollLeft()
  };
  setTimeout(function() {
    $('#mapLeft').scrollTop(offset.scrollLeft);
    $('#mapLeft').scrollLeft(offset.scrollTop);
  }, 500);
});


function openPhotoSwipe(photoArray, index, closeCallback) {

  var pswpElement = $('.pswp')[0];
  var options = {
        index: index
    };
  var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, photoArray, options);

  // make show map button invisible or not depending on
  // whether photo is geo-tagged:
  var prepareMapButton = function() {
    if ( gallery.currItem.geo )
      $('.pswp__button--mapIt').css('display', 'block');
    else 
      $('.pswp__button--mapIt').css('display', 'none');
  };

  gallery.listen('beforeChange', function() { 
    photoEvents.fire(gallery.currItem.id);
    prepareMapButton();
  });

  // scroll once load is complete:
  // gallery.listen('afterChange', function() {
  //   var itemId = gallery.currItem.id;
  //   scrollToSelected($('#mapLeft'), $('#'+itemId+'-img'));
  // });

  // create variable that will store real size of viewport
  var realViewportWidth,
    useLargeImages = false,
    firstResize = true,
    imageSrcWillChange;

  /* this 'responsive' code is copied directly from photoswipe.com */
  // beforeResize event fires each time size of gallery viewport updates
  gallery.listen('beforeResize', function() {

    // calculate real pixels when size changes
    realViewportWidth = gallery.viewportSize.x * window.devicePixelRatio;

    // Find out if current images need to be changed
    if(useLargeImages && realViewportWidth < 1000) {
      useLargeImages = false;
      imageSrcWillChange = true;
    } else if(!useLargeImages && realViewportWidth >= 1000) {
      useLargeImages = true;
      imageSrcWillChange = true;
    }

    // Invalidate items only when source is changed and when it's not the first update
    if(imageSrcWillChange && !firstResize) {
      // invalidateCurrItems sets a flag on slides that are in DOM,
      // which will force update of content (image) on window.resize.
      gallery.invalidateCurrItems();
    }

    if(firstResize) 
      firstResize = false;

    imageSrcWillChange = false;

  });

  // gettingData event fires each time PhotoSwipe retrieves image source & size
  gallery.listen('gettingData', function(index, item) {
    // Set image source & size based on real viewport width,
    // but only if the scaled images actuallly exist:
    if( useLargeImages || item.scaled !== null ) {
      item.src = item.full.name;
      item.w = item.full.width;
      item.h = item.full.height;
    } else {
      item.src = item.scaled.name;
      item.w = item.scaled.width;
      item.h = item.scaled.height;
    }
  });
  
  gallery.listen('close', function() {
    closeCallback();
  });

  // close gallery, center on pin
  // and zoom map on button click:
  $('.pswp__button--mapIt').on('click touchstart', function(e) {
    e.stopPropagation()
    photoSwipeMapButtonEvents.fire(gallery.currItem.id);
    // timeout is only way I can find to prevent touch
    // from causing picture below map icon to immediately
    // load a new gallery:
    setTimeout(function() {
      gallery.close(); 
    }, 250);
  });

  // and initialize:
  console.log('about to init');
  gallery.init();

};
