// TODO
/* 
3 events:
1) photoSwipe open
2) marker click
3) photoList click

. photoswipe
 -- open on marker click
 -- open on photoList click
. photoList
 -- scroll to photo on photoSwipe open
 -- scroll to photo on marker click
. marker
 -- change color on photoList click
 -- change color on photoSwipe open
*/

// pass it the name of the container div and the
// item div you want to move to top of list:
var scrollToSelected = function($ctDiv, $itDiv) {
  var scrollSpeed = 250;
  // portrait --
  // the portrait code is shaky but it's 
  // working for mobile devices tested so far --
  // doesn't work on desktop, but less likely to
  // be an issue
  if (window.orientation == 0) {
        $ctDiv.animate({
           scrollLeft: $itDiv.offset().left 
            + $ctDiv.scrollLeft() 
            - $ctDiv.offset().left
        }, scrollSpeed);
  // landscape or window.orientation undefined:
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


function plusOrMinus() {
  return Math.random() < 0.5 ? -1 : 1
}


function jitter(zoom) {
  var numerator = Math.random() * plusOrMinus();
  var denominator = Math.pow(zoom, 3);
  return zoom < 18 ? numerator/denominator : 0;
};


class MapController extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.mapIsVisible) {
      return (
        <Map mapCanvas={this.refs.mapCanvas} data={this.props.data}></Map>
      );
    }
    return null;
  }
}


class Marker extends React.Component {
  constructor(props) {
    super(props);
    this.state = {initialized: false};
    let selectedColor = '#671780';
    let basePinColor = 'FE7569';
    let changedPinColor = '8169fe';
    this.basePin = setPinColor(basePinColor);
    this.changedPin = setPinColor(changedPinColor);
  }

  onClick() {
    // put clicked item at top of list:
    scrollToSelected($('.PhotoList'), $('#'+this.props.md5sum));

    // change pin color
    this.marker.setIcon(this.changedPin);    
  }

  // take an array, parse it for photos with coordinates,
  // add them to map, and add call to magnific photo:
  addPin() {
    console.log('adding pin');
    let map = this.props.map;
    let photo = this.props.photo;
    let zoom = map.getZoom();
    let longitude = photo.longitude ? photo.longitude : null;
    var latitude = photo.latitude ? photo.latitude : null;
    // only if photo actually has coordinates:
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

    //   // add to assoc array:
    // markerObj[marker.md5sum] = marker;  
    // // do stuff when clicked:
    // marker.addListener('click', function() {
    //   // put clicked item at top of list:
    //   // scrollToSelected($('#mapLeft'), $('#'+marker.md5sum+'-img'));
    //   // change pin color
    //   marker.setIcon(changedPin);
    //   // open the appropriate photo, 
    //   // based on array index:
    //   openPhotoSwipe(index);
    // });
  }

  componentDidUpdate(prevProps) {
    if (this.props.map) {
      if (!this.state.initialized) {
        this.addPin()
      }
    }
  }

  render() {
    return null;
  }
}


class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = { initialized: false, map: null };
  }

  initialize() {
    let locale = new google.maps.LatLng(30,0);
    let mapOptions = {
      center: locale,
      zoom: 4,
      minZoom: 2,
      keyboardShortcuts: false,
      // HYBRID like SATELLITE, but shows labels:
      mapTypeId: google.maps.MapTypeId.ROADMAP // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };
    this.setState({ map: new google.maps.Map(this.refs.mapCanvas, mapOptions) });

    // this.markerObj = {};
    this.setState({initialized: true});

  }

  componentDidMount() {
    if (!this.state.initialized) {
      console.log('initializing');
      this.initialize();
    }
  }

  render() {
    var markers = this.props.data.map(function(p) {
      // only render marker if it actually has coordinates:
      if (p.longitude && p.latitude) {
        return (
          <Marker map={this.state.map} photo={p} key={p.md5sum} md5sum={p.md5sum}></Marker>
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


class Photo extends React.Component {

  constructor(props) {
    super(props);
    // this.state = {date: new Date()};
  }

  render() {
    return (
      <div className="ListItem" id={this.props.photo.md5sum} >
          <img className="thumbnail" src={this.props.photo.small.name} height={this.props.photo.small.height} width={this.props.photo.small.width}> 
          </img>
      </div>
    );
  }
}


class PhotoList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var Photos = this.props.data.map(function(p) {
      return (
        <Photo photo={p} key={p.md5sum}></Photo>
      );
    });

    return (
      <div className="PhotoList">
        {Photos}
      </div>
    );
  }
}


class App extends React.Component {
  constructor(props) {
    super(props);
    this.pollInterval = 30000;
    this.state = { data: null , url: this.props.url, mapIsVisible: true};
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
          this.setState({ data: data });
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
    setInterval(this.poll.bind(this), this.pollInterval);
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
          <PhotoList data={this.state.data} />
          <MapController data={this.state.data} mapIsVisible={this.state.mapIsVisible} />
        </div>
      );
    }
  }
}


ReactDOM.render(
  <App url="/api/users/8/photos" />,
  document.getElementById('content')
);



