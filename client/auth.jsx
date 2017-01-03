class Auth {
  constructor() {
    this.storage = localStorage;
    this.isLoggedIn = this.isLoggedIn.bind(this);
  }

  getToken() {
    return this.storage.token;
  }

  setToken(token) {
    this.storage.token = token;
  }

  getTokenExpiration() {
    return this.storage.tokenExpiration;
  }

  // takes iso-formatted string, saves as Date object:
  setTokenExpiration(expiration) {
    this.storage.tokenExpiration = expiration; 
  }

  getUserName() {
    return this.storage.userName;
  }

  setUserName(userName) {
    this.storage.userName = userName;
  }

  getUserId() {
    return this.storage.userId;
  }

  setUserId(userId) {
    this.storage.userId = userId;
  }

  getUserUri() {
    return this.storage.userUri;
  }

  setUserUri(userUri) {
    this.storage.userUri = userUri;
  }

  getUserRoles() {
    return this.storage.userRoles;
  }

  setUserRoles(roles) {
    this.storage.userRoles = roles;
  }

  isLoggedIn() {
    let token = this.getToken();
    let tokenExpiration = new Date(this.getTokenExpiration());
    let curTime = new Date();
    if (!!token && curTime < tokenExpiration) {
      console.log('logged in');
      return true;
    }
    console.log(!!token);
    console.log(curTime < tokenExpiration);
    console.log('not logged in');
    return false;
  }

  logOut() {
    
  }
}

export { Auth };
