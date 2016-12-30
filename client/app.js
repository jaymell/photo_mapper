var PhotoSwipe = require('photoswipe/dist/photoswipe.js');
var PhotoSwipeUI_Default = require('photoswipe/dist/photoswipe-ui-default.js');
var $ = require('jquery');
global.jQuery = require('jquery');
require('jquery-mousewheel')($);
var React = require('react');
var ReactDOM = require('react-dom');
var Router = require('react-router').Router;
var Route = require('react-router').Route;
var Link = require('react-router').Link;
var hashHistory = require('react-router').hashHistory;
require('../node_modules/bootstrap/dist/js/bootstrap.min.js')
require('../node_modules/jquery-lazyload/jquery.lazyload.js')
require('./app.css');

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
function scrollToSelected($ctDiv, $itDiv) {
  var scrollSpeed = 250;
  $ctDiv.animate({
     scrollLeft: $itDiv.offset().left 
      + $ctDiv.scrollLeft() 
      - $ctDiv.offset().left
  }, scrollSpeed);
};

function horizontalMouseWheelScroll(event, delta) {
  this.scrollLeft -= (delta * 30);
  event.preventDefault();
}


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
        <Map activePhoto={this.state.activePhoto} 
             mapCanvas={this.refs.mapCanvas} 
             data={this.props.data}>
        </Map>
      );
    }
    return null;
  }
}


class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = { initialized: false };
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
      this.map.setCenter(locale);
      if (this.map.getZoom() < 18 ) {
        this.map.setZoom(18);
      }      
    }
  }

  initialize() {
    setMapSize();
    let locale = new google.maps.LatLng(30,0);
    let mapOptions = {
      center: locale,
      zoom: 4,
      minZoom: 2,
      keyboardShortcuts: false,
      mapTypeId: google.maps.MapTypeId.ROADMAP // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };
    photoSwipeMapButtonEvents.add(this.handlePhotoSwipeMapButton.bind(this));
    this.map = new google.maps.Map(this.refs.mapCanvas, mapOptions), 
    this.setState({initialized: true});
  }

  componentDidMount() {
    if (!this.state.initialized) {
      console.log('initializing');
      this.initialize();
      // properly size map on resize:
      $(window).resize(setMapSize);
    }
  }

  componentWillUnmount() {
    console.log('removing map');
    this.map = null;
  }

  render() {
    var markers = this.props.data.map(function(p, i) {
      // only render marker if it actually has coordinates:
      if (p.longitude && p.latitude) {
        return (
          <Marker activePhoto={this.props.activePhoto} 
                  map={this.map} 
                  photo={p} 
                  key={p.md5sum}>
          </Marker>
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

  componentWillUnmount() {
    console.log('removing marker');
    this.marker.setMap(null);
  }

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
    // required to properly handle 'off' method for resize event:
    this.setPhotoListSize = this.setPhotoListSize.bind(this);
  }

  setStyle() {
    if (this.props.mapIsVisible) {
      // FIXME: don't duplicate this -- alreday done in setPhotoListSize
      var imageWidth = 100;
      var w  = $(window).width() - ($(window).width() % imageWidth );
      var leftMargin = -(w/2);
      this.setState({style: {
        'overflowX': 'scroll',
        'overflowY': 'hidden',
        'overflow': 'auto',
        'height': 'auto',
        'whiteSpace': 'nowrap',
        'position': 'fixed',
        'bottom': '0',
        'zIndex': '1',
        'left': '50%',
        'marginLeft': leftMargin
        }
      });
    }
    else {
      this.setState({style: {
        'overflow': 'auto',
        'overflowX': 'visible',
        'overflowY': 'visible',
        'width': 'auto',
        'height': 'auto',
        'whiteSpace': 'normal',
        'position': 'relative',
        'bottom': 'initial',
        'zIndex': 'initial',
        'left': 'initial',
        'marginLeft': 'initial'
        }
      });      
    }
  }

  setPhotoListSize() {
    console.log('called setPhotoListSize -- current width: ', $(this.refs.photoList).css('width'));
    // only do this if map is visible:
      var imageWidth = 100;
      var w  = $(window).width() - ($(window).width() % imageWidth );
      var leftMargin = -(w/2);
      $(this.refs.photoList).css({
        'width': w,
        'marginLeft': leftMargin,
        'left': '50%'
      });    
    console.log('setPhotoListSize -- new width: ', $(this.refs.photoList).css('width'));
  }

  handleMapVisible() {
    console.log('photoList: turning map ON');
    this.setState({photoSize: 'small'});
    this.setStyle();
    $(this.refs.photoList).on('mousewheel', horizontalMouseWheelScroll);
    $(window).on('resize', this.setPhotoListSize);
    setTimeout(function() { this.setPhotoListSize(); }.bind(this), 0);
    $("img.lazy").lazyload({
      container: $('.photoList'),
    });
  }  

  handleMapNotVisible() {
    console.log('photoList: turning map OFF');
    this.setState({photoSize: 'thumbnail'})
    this.setStyle();
    $(this.refs.photoList).off('mousewheel', horizontalMouseWheelScroll);
    $(window).off('resize', this.setPhotoListSize);
    $("img.lazy").lazyload({
      effect: "fadeIn",
      effectspeed: 500
    });
  }

  handleEvent(e) {
    scrollToSelected($(this.refs.photoList), $('#'+e));
  }

  componentWillMount() {
    console.log('photoList: consructor called: ', this.props);
    photoEvents.add(this.handleEvent.bind(this));
    this.setStyle();
    if (this.props.mapIsVisible) {
      this.handleMapVisible();
    }
    else {
      this.handleMapNotVisible();
    }
  }

  componentDidMount() {
     if (this.props.mapIsVisible) {
      this.handleMapVisible();
    }
    else {
      this.handleMapNotVisible();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.mapIsVisible != this.props.mapIsVisible) {
      if (this.props.mapIsVisible) {
        this.handleMapVisible();
      }
      else {
        this.handleMapNotVisible();
      }        
    }
  }

  onPhotoClick(photoId) {
    photoEvents.fire(photoId);
  }

  render() {
    var Photos = this.props.data.map(function(p) {
      return (
        <Photo onPhotoClick={this.onPhotoClick} photo={p} key={p.md5sum} size={this.state.photoSize}></Photo>
      );
    }.bind(this));

    return (
      <div className="photoList" ref="photoList" style={this.state.style}>
        {Photos}
      </div>
    );
  }
}


class Photo extends React.Component {
  constructor(props) {
    super(props);
    this.placeholder = '/static/lib/img/placeholder.png';
  }

  _onClick() {
    this.props.onPhotoClick(this.props.photo.md5sum);
  }

  render() {
    let photo = this.props.photo[this.props.size];
    return (
      <div className="listItem" id={this.props.photo.md5sum} >
          <img onClick={this._onClick.bind(this)} 
               className="thumbnail img-responsive lazy" 
               data-original={photo.name}
               src={this.placeholder}
               width={photo.width}
               height={photo.height}
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
    // set list width to change on resize:
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
        <button className="navbar-toggle" 
                type="button" 
                data-toggle="collapse"
                data-target="#navbarResponsive"
        >
        <span className="icon-bar"></span>
        <span className="icon-bar"></span>
        <span className="icon-bar"></span>       
        </button>
        <Logo src="/static/lib/img/logo.png" width="30px" height="40px" />
        <div className="collapse navbar-collapse" id="navbarResponsive">
          <ul className="nav navbar-nav navbar-right">
            <li className="nav-item">
              <MapToggler toggleMap={this.props.toggleMap} />
            </li>
          </ul>
        </div>
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
        <img className="img-thumbnail logo navbar-left" 
             src={this.props.src} 
             width={this.props.width} 
             height={this.props.height} >
       </img>
    )
  }
}


class MapToggler extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <button onClick={this.props.toggleMap} 
              className="mapToggler btn btn-default nav-item" 
              type="button">
              Toggle Map
      </button>
    );
  }
}


class Photos extends React.Component {
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

  toggleMap() {
    if ( this.state.mapIsVisible ) {
      this.setState({mapIsVisible: false })
    }
    else {
      this.setState({mapIsVisible: true })
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
          <MapContainer data={this.state.data} mapIsVisible={this.state.mapIsVisible} />
          <PhotoList ref="photoList" data={this.state.data} mapIsVisible={this.state.mapIsVisible} />
          <PhotoSwipeContainer data={this.state.data} />
        </div>
      );
    }
  }
}


class AuthRequired extends React.Component {
  constructor(props) {
    super(props);
  }

  getToken() {

  }

  isTokenExpired() {

  }

  isLoggedIn() {

  }

}

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: '', pass: '' };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleUser = this.handleUser.bind(this);
    this.handlePassword = this.handlePassword.bind(this);
  }

  componentWillUnmount() {
    $(this.refs.loginModal).removeClass('fade').modal('hide');
  }

  handleSubmit(e) {
    e.preventDefault();
    console.log(this.state.user, this.state.pass);
    // $.ajax({
    //   url: '/api/token',
    //   user: 
    // })
  }

  handleUser(e) {
    this.setState({user: e.target.value });
  }

  handlePassword(e) {
    this.setState({pass: e.target.value });
  }

  render() {
    return (
      <div>
      <a href="#" data-toggle="modal" data-target="#login-modal">Login</a>
      <div ref="loginModal" 
           className="modal fade" 
           id="login-modal" 
           tabIndex="-1" 
           role="dialog" 
           aria-labelledby="myModalLabel" 
           aria-hidden="true" 
           style={{display: "none"}}>
        <div className="modal-dialog">
          <div className="loginmodal-container">
            <h1>Login to Your Account</h1><br />
            <form>
              <input type="text"
                     name="user"
                     value={this.state.user} 
                     placeholder="Username"
                     onChange={this.handleUser}
              />
              <input type="password" 
                     name="password"
                     value={this.state.pass} 
                     placeholder="Password"
                     onChange={this.handlePassword}
              />
              <input type="submit" 
                     name="login" 
                     className="login loginmodal-submit" 
                     value="Login" 
                     onClick={this.handleSubmit}
              />
            </form>
            <div className="login-help">
              <a href='/#/register'>Register</a> - <Link to='/reset'>Forgot Password</Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }
}

class Register extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <h1>Register</h1>
  }
}

class Reset extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <h1>Reset</h1>
  }
}


class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Router history={hashHistory}>
        <Route path='/login' component={Login} />
        <Route path='/register' component={Register} />
        <Route path='/reset' component={Reset} />
        <Route component={AuthRequired}>
          <Route path='/photos' component={Photos} />
        </Route>
      </Router>
    )
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

function setMapSize() {
  console.log('called SetMapSize');
  var h = $(window).height();
  var offsetTop = 65; // Calculate the top offset
  $('.mapCanvas ').css('height', (h - offsetTop));
}

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
