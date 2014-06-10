var request = require("request");
var XMLWriter = require('xml-writer');
var jsxml = require("node-jsxml");

// ********** Constructor ***************
// Creates the object 
// 
// Example: 
// var tabrest = new require('./tabREST');
// var tr = new tabrest();
// tr.login("http://serverurl", "admin", "admin", '', function(){});
function TabREST() {
	this.serverURL;
	this.siteURL;
	this.authToken;
	
}

// ********** login ***************
// Logs in to Server and stores the auth token and then calls the callback parameter
// Because logging in is a synchronous call and all further calls must use the authToken,
//   most of the code that uses this module will happen inside of the callback.
// @serverURL Url of Tableau Server. Must include protocol eg "http://myServer"
// @username an administrative login to the Server
// @password
// @siteURL the identifier of the site that comes after /t/.
// @callBack(err, response, authToken)
//     @@err error from call to Server. Null if call was succesful
//     @@responseCode 200 if login succeeded. See REST API documentation if not 200. Null if err
//     @@authToken the authToken from the login. This is stored with the object so nothing manual
//         is required to do with this. Null if there is an err or responseCode != 200
//
TabREST.prototype.login = function(serverURL, username, password, siteURL, callback) {
	this.serverURL = serverURL;
	this.siteURL = (siteURL ? siteURL : "");
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', username)
		.writeAttribute('password', password).startElement('site').writeAttribute('contentUrl', this.siteURL);
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

/**
 * getAuthToken returns the authToken that Server returned when loggin in.
 * 
 * @return {string} Auth token from server. Used in the header of all other Server calls.
 *                       (NULL) if login() has not been called.
 */
TabREST.prototype.getAuthToken = function() {
	return this.authToken;
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
			return;
		}
	);	
}

module.exports = TabREST;