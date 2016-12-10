class Album extends React.Component {

  constructor(props) {
    super(props);
    // this.state = {date: new Date()};
  }

  render() {
    return ( 
      <div class="thumbnail-div">
        <a class="albumLink" href={this.props.album.uri}>
          <img class="thumbnail" src={this.props.album.photos[0].thumbnail.name} height={this.props.album.photos[0].thumbnail.height} width={this.props.album.photos[0].thumbnail.width}> 
          </img>
        </a>
        <span class="albumItem">{this.props.album_name}</span>
      </div>
    );
  }
}


class AlbumList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    var Albums = this.props.data.map(function(a) {
      return (
        <Album album={a}></Album>
      );
    });

    return (
      <div className="AlbumList">
        {Albums}
      </div>
    );
  }
}


class AlbumBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { data: null };
  }

  loadAlbumData() {
    $.ajax({
      url: this.props.url,
      dataType: 'json',
      cache: false,
      success: function(data) {
        this.setState({ data: data });
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());
      }.bind(this)
    });
  }

  componentDidMount() {
    this.loadAlbumData();
    //setInterval(this.loadAlbumData, this.props.pollInterval);
  }
    
  render() {
    if (!this.state.data) return ( <div classname="AlbumBox"> <blink><b>Loading ...</b></blink> </div> )
    else { 
      return (
        <div className="AlbumBox">
          <AlbumList data={this.state.data} />
        </div>  
      );
    }
  }
}

ReactDOM.render(
  <AlbumBox url="/api/users/8/albums" pollInterval={10000} />,
  document.getElementById('content')
);



