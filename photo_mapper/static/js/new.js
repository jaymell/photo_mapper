class Photo extends React.Component {

  constructor(props) {
    super(props);
    // this.state = {date: new Date()};
  }

  render() {
    return (
      <div className="ListItem">
          <img className="thumbnail" src={this.props.photo.thumbnail.name} height={this.props.photo.thumbnail.height} width={this.props.photo.thumbnail.width}> 
          </img>
      </div>
      );
    // FIXME: for albums
    // return ( 
    //   <div className="ListItem">
    //       <img className="thumbnail" src={this.props.album.photos[0].small.name} height={this.props.album.photos[0].small.height} width={this.props.album.photos[0].small.width}> 
    //       </img>
    //     <span>{this.props.album.album_name}</span>
    //   </div>
    // );
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


class PhotoBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: null , url: this.props.url, pollInterval: this.props.pollInterval};
  }

  poll() {
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

  startPolling() {
    console.log('starting polling')
    setInterval(this.poll.bind(this), this.state.pollInterval);
  }

  componentDidMount() {
    this.startPolling();
  }
    
  render() {
    if (!this.state.data) return ( <div><b>Loading ...</b></div> )
    else { 
      return (
        <div className="PhotoBox">
          <PhotoList data={this.state.data} />
        </div>  
      );
    }
  }
}


ReactDOM.render(
  <PhotoBox url="/api/users/8/photos" pollInterval={5000} />,
  document.getElementById('content')
);



