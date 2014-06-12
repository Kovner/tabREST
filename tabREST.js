var request = require("request");
var XMLWriter = require('xml-writer');
var jsxml = require("node-jsxml");

// ********** Constructor ***************
// Creates the object 
// 
// Example: 
// var tabrest = new require('./tabREST');
// var tr = new tabrest();
// tr.signin("http://serverurl", "admin", "admin", '', function(){});
function TabREST() {
	this.serverURL;
	this.siteURL;
	this.authToken;
	
}


// ********************************
// ********************************
// **** Authentication Related Functions ****
// ********************************
// ********************************
// signin (as admin), signinAsUser, getAuthToken, signout, 


// ********** signin ***************
// Logs in to Server and stores the auth token and then calls the callback parameter
// Because logging in is a synchronous call and all further calls must use the authToken,
//   most of the code that uses this module will happen inside of the callback.
// @serverURL Url of Tableau Server. Must include protocol eg "http://myServer"
// @adminUsername an administrative login to the Server
// @password
// @siteURL the identifier of the site that comes after /t/.
// @callBack(err, response, authToken)
//     @@err error from call to Server. Null if call was succesful
//     @@responseCode 200 if login succeeded. See REST API documentation if not 200. Null if err
//     @@authToken the authToken from the login. This is stored with the object so nothing manual
//         is required to do with this. Null if there is an err or responseCode != 200
//
TabREST.prototype.signin = function(serverURL, adminUsername, adminPassword, siteURL, callback) {
	this.serverURL = serverURL;
	this.siteURL = (siteURL ? siteURL : "");
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', adminUsername)
		.writeAttribute('password', adminPassword).startElement('site').writeAttribute('contentUrl', this.siteURL);
	var self = this;
	request.post(
		{
			url: serverURL + '/api/2.0/auth/signin',
			body: reqxml.toString(),
			headers: {'Content-Type': 'text/xml'}
		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null);
				}
				return;
			}
			if(response.statusCode != 200) {
				if(callback) {
					callback(null, response.statusCode, null);
				}
				return;
			}

			var bodyXML = new jsxml.XML(body);
			self.authToken = bodyXML.child('credentials').attribute("token").getValue();
			if(callback) {
				callback(null, response.statusCode, self.authToken);
			}
		}
	);
}

TabREST.prototype.signinAsUser = function(serverURL, adminUsername, adminPassword, user, siteURL, callback) {

// *****************************
// ********* TODO **************
// I added parameters for user and added it to the xml, but I need to check the rest of the code to see
// if i need to change anything else.
// *****************************
// ****************************
	this.serverURL = serverURL;
	this.siteURL = (siteURL ? siteURL : "");
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', adminUsername)
		.writeAttribute('password', adminPassword).startElement('site').writeAttribute('contentUrl', this.siteURL).endElement()
		.startElement('user').writeAttribute('id', user);
	console.log(reqxml.toString());
	var self = this;
	request.post(
		{
			url: serverURL + '/api/2.0/auth/signin',
			body: reqxml.toString(),
			headers: {'Content-Type': 'text/xml'}
		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null);
				}
				return;
			}
			console.log(response.statusCode);
			if(response.statusCode != 200) {
				if(callback) {
					callback(null, response.statusCode, null);
				}
				return;
			}

			var bodyXML = new jsxml.XML(body);
			console.log(bodyXML.toString());
			self.authToken = bodyXML.child('credentials').attribute("token").getValue();
			if(callback) {
				callback(null, response.statusCode, self.authToken);
			}
		}
	);
}

/**
 * getAuthToken returns the authToken that Server returned when loggin in.
 * 
 * @return {string} Auth token from server. Used in the header of all other Server calls.
 *                       (NULL) if signin() has not been called.
 */
TabREST.prototype.getAuthToken = function() {
	return this.authToken;
}


// ********************************
// ********************************
// **** User Management Functions ****
// ********************************
// ********************************
// addUserToSite, getUsersOnSite, removeUsersOnSite


/**
 * Add a user to a site
 * @param {string}   username username to be added
 * @param {string}   siteID   siteID of where to add the user. This can be retried with querySite()
 * @param {function} callback(err, responseCode, userID, username) function to call after adding the user. 
 *     @@err error object from the call to Server. null if no error
 *     @@responseCode response code returned from the call to Server. null if err. 201 if succesful. null if err
 *     @@userID userID of the newly added user. null if err or responseCode != 201
 *     @@userName userName of the newly added user. null if err or responseCode != 201
 */
TabREST.prototype.addUserToSite = function(username, siteID, callback) {
	//First, build the XML for the POST
	//TODO: Add logic to allow user to provide options for the creation of the user
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('user')
		.writeAttribute('name', username).writeAttribute('role', 'Interactor')
		.writeAttribute('publish', 'true').writeAttribute('contentAdmin','false')
		.writeAttribute('suppressGettingStarted', 'true');
	request.post( 
		{
			url: this.serverURL + '/api/2.0/sites/' + siteID + '/users/',
			body: reqxml.toString(),
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': this.authToken
			}
		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null, null);
				}
				return;
			}
			if(response.statusCode != 201) {
				if(callback) {
					callback(null, response.statusCode, null, null);
				}
				return;
			}
			//If the request was succesful we get xml back that contains the id and name of the added user.
			var bodyXML = new jsxml.XML(body);
			var userID = bodyXML.child('user').attribute('id').getValue();
			var userName = bodyXML.child('user').attribute('name').getValue();
			if(callback) {
				callback(null, response.statusCode, userID, userName);
			}
			
		}
	);	
}

/**
 * Query all of the users on specified site
 * @param  {string}   siteID   [Site id as returned by query site (not the site name)]
 * @param  {Function} callback [function to call upon completion of the request to Server]
 *     @@err err from the request to server. Null if no error
 *     @@respCode statusCode returned from the request to Server
 *     @@users list of users in JSON. 
 *         Ex: for(var user in users){...} to iterate over the names of all of the users.
 *         users['Mike']['id'] to get Mike's userID
 *         Other attributes: users[name]['role'], users[name]['publish'], users[name]['contentAdmin'],
 *             users[name]['lastLogin'], users[name]['externalAuthUserId']
 */
TabREST.prototype.getUsersOnSite = function(siteID, callback) {
	request(
		{
			url: this.serverURL + '/api/2.0/sites/' + siteID + '/users/',
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': this.authToken
			}

		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null);
				}
				return;
			} 
			if(response.statusCode != 200) {
				if(callback) {
					callback(null, response.statusCode, null);
				}
				return;
			}
			var bodyXML = new jsxml.XML(body);
			var users = {};
			bodyXML.descendants('user').each(function(user,index) {
				users[user.attribute('name').getValue()] = {
					id: user.attribute('id').getValue(),	
					role: user.attribute('role').getValue(),	
					publish: user.attribute('publish').getValue(),	
					contentAdmin: user.attribute('contentAdmin').getValue(),	
					lastLogin: user.attribute('lastLogin').getValue(),	
					externalAuthUserId: user.attribute('externalAuthUserId').getValue(),	
				};
			});
			if(callback) {
				callback(null, response.statusCode, users);
			}	
		}
	);	
}

/**
 * Remove specified user from specified site
 * @param  {string}   userID   userID of the user to remove
 * @param  {string}   siteID   siteID to remove the user from
 * @param  {Function} callback(err, status)
 *     @@err err object from the call to Server. null if no error
 *     @@status http status code from the call to Server. 204 is succesful. null if err.
 */
TabREST.prototype.removeUserFromSite = function(userID, siteID, callback) {
	request(
		{
			url: this.serverURL + '/api/2.0/sites/' + siteID + '/users/' + userID,
			method: 'DELETE',
			headers: {
				'X-Tableau-Auth': this.authToken
			}
		},

		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null);
				}	
				return;
			}
			if(callback) {
				callback(null, response.statusCode);
			}
		}
	);	
}


// ********************************
// ********************************
// **** Site Management Functions ****
// ********************************
// ********************************
// createSite, updateSite, querySite, deleteSite

/**
 * Creates a site with specified name as the site name and site url.
 * Uses defaults for contentAdmin, userQuota, and storageQuota
 * TODO: provide mechanism for including options object.
 * @param  {string}   siteName name of the site to add
 * @param  {Function} callback function to call after making the request to Server
 *     @@err error object from the request to Server. Null if no errors
 *     @@statusCode http status code from the request to Server. null if err
 *     @@addedSiteID id of the newly added site
 *     @@addedSiteName name of the newly added site
 */
TabREST.prototype.createSite = function(siteName, callback) {
	//First, build the XML for the POST
	//TODO: Add logic to allow user to provide options for the creation of the site
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('site')
		.writeAttribute('name', siteName).writeAttribute('contentUrl', siteName)
		.writeAttribute('disableSubscriptions','false');
	request.post( 
		{
			url: this.serverURL + '/api/2.0/sites/',
			body: reqxml.toString(),
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': this.authToken
			}
		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null, null);
				}
				return;
			}
			if(response.statusCode != 201) {
				if(callback) {
					callback(null, response.statusCode, null, null);
				}
				return;
			}
			//If the request was succesful we get xml back that contains the id and name of the added user.
			var bodyXML = new jsxml.XML(body);
			var addedSiteID = bodyXML.child('site').attribute('id').getValue();
			var addedSiteName = bodyXML.child('site').attribute('name').getValue();
			if(callback) {
				callback(null, response.statusCode, addedSiteID, addedSiteName);
			}
		}
	);	
}

/**
 * Deletes the specified site
 * @param  {string}   site     id, name, or contentUrl of the site to delete
 * @param  {string}   key      method to specify which site to delete.
 *     Acceptable values: 'id', 'name', or 'contentUrl'.
 * @param  {Function} callback function to call after making the request to Server
 *     @@err error object from the request to Server. Null if no errors
 *     @@statusCode http status code from the request to Server. null if err
 */
TabREST.prototype.deleteSite = function(site, key, callback) {
	var keyParam;
	if(key === 'id') {
		keyParam = '';
	} else {
		keyParam = "?key=" + key;
	}
	request(
		{
			url: this.serverURL + '/api/2.0/sites/' + site + keyParam,
			method: 'DELETE',
			headers: {
				'X-Tableau-Auth': this.authToken
			}
		},

		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null);
				}	
				return;
			}
			if(callback) {
				callback(null, response.statusCode);
			}
		}
	);	
}

/**
 * Query Server for the SiteID of given siteURL
 * @param  {string}   siteURL  contentUrl of Site (the name of the site as appears in the Server url after /t/)
 * @param  {Function} callback(err, responseCode, siteID) function to call after we receive the siteID from Server.
 *    @@err error object from the call to Server. Null if no error.
 *    @@statusCode status Code from the call to Server. 200 if succesful. Null if err.
 *    @@siteID ID of the site to use in future calls. Null if err or statusCode != 200
 */
TabREST.prototype.querySite = function(siteURL, callback) {
	request(
		{
			url: this.serverURL + '/api/2.0/sites/' + siteURL + '?key=name',
			headers: {
				'Content-Type': 'text/xml',
				'X-Tableau-Auth': this.authToken
			}

		},
		function(err, response, body) {
			if(err) {
				if(callback) {
					callback(err, null, null);
				}
				return;
			} 
			if(response.statusCode != 200) {
				if(callback) {
					callback(null, response.statusCode, null);
				}
				return;
			}
			var bodyXML = new jsxml.XML(body);
			var siteID = bodyXML.child('site').attribute("id").getValue();
			if(callback) {
				callback(null, response.statusCode, siteID);
			}
		}
	);	
}

module.exports = TabREST;