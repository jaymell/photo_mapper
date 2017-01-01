class Auth {
  constructor() {
    this.storage = localStorage;
  }

  getToken() {
    return this.storage.token;
  }

  setToken(token) {
    this.storage.token = token;
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

  // FIXME: this needs to account
  // for token expiration as well:
  isLoggedIn() {
    return !!this.getToken();
  }
}

export { Auth };