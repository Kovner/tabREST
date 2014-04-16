var request = require("request");
var XMLWriter = require('xml-writer');
var jsxml = require("node-jsxml");

// ********** Constructor ***************
// Creates the object and stores the serverURL
// @serverURL Url of Tableau Server. Must include protocol eg "http://myServer"
// @username an administrative login to the Server
// @password
// @siteUrl the identifier of the site that comes after /t/. "" (Default) if not provided
//
// If username and password are provided then logs in and stores the token
function TabREST(serverURL, username, password, siteUrl) {
	//TODO: handle a variable amount of supplied parameters
	this.serverURL = serverURL;
	this.siteUrl = (siteUrl ? siteUrl : "");
	var reqxml = new XMLWriter();
	reqxml.startElement('tsRequest').startElement('credentials').writeAttribute('name', username)
		.writeAttribute('password', password).startElement('site').writeAttribute('contentUrl', this.siteUrl);
	console.log("Login Request:");
	console.log(reqxml.toString() + '\n');
	request.post(
		{
			url: serverURL + '/api/2.0/auth/signin',
			body: reqxml.toString(),
			headers: {'Content-Type': 'text/xml'}
		},
		function(err, response, body) {
			console.log("Login Response:");
			console.log(body + '/n');
			var bodyXML = new jsxml.XML(body);
			this.token = bodyXML.child('credentials').attribute("token").getValue();
			console.log('token:');
			console.log(this.token + '\n');
		}
	);

	// ********** signOut **************
	// No parameters
	// @return status code from request. 200 if succesful
	function signOut() {
		request.post(
			{
				url: serverURL + '/api/2.0/auth/signin',
				headers: {
					'Content-Type': 'text/xml',
					'X-tableau-auth': this.token
				}

			},
			function(err, response, body) {
				return response;
			}
		);
	}
}

module.exports = TabREST;