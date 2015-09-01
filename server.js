// BASE SETUP
// ======================================

// CALL THE PACKAGES --------------------
var express    = require('express');		// call express
var app        = express(); 				// define our app using express
var bodyParser = require('body-parser'); 	// get body-parser
var morgan     = require('morgan'); 		// used to see requests
var mongoose   = require('mongoose');
var User       = require('./app/models/user');
var port       = process.env.PORT || 8080; // set the port for our app
var jwt 	   = require('jsonwebtoken');
var superSecret= 'manwhobuggeredaheron';

// APP CONFIGURATION ---------------------
// use body parser so we can grab information from POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure our app to handle CORS requests
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
	next();
});

// log all requests to the console 
app.use(morgan('dev'));

// connect to our database (hosted on mongolab)

// var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }, 
//                 replset: { socketOptions: { keepAlive: 1, connectTimeoutMS : 30000 } } };   

var mongodbUri = "mongodb://chigs85:newmag1@waffle.modulusmongo.net:27017/ux8ynupE";
// var mongooseUri = uriUtil.formatMongoose(mongodbUri);
mongoose.connect(mongodbUri);

// ROUTES FOR OUR API
// ======================================

// basic route for the home page
app.get('/', function(req, res) {
	res.send('Welcome to the home page!');
});

// get an instance of the express router
var apiRouter = express.Router();

//route for authenticating users (POST http://localhost:8080/api/authenticate)


apiRouter.post('/authenticate', function(req, res) {

		// find the user
		// select the name username and password explicitly
		User.findOne({
			username: req.body.username
		   }).select('firstname username password').exec(function(err, user) {

		   	if (err) throw err;

		   	// no user with that username was found
			if (!user) { 
			  res.json({

				success: false,
				message: 'Authentication failed. User not found.'

			});
		} else if (user) {

			//check if pasword matches

			var validPassword = user.comparePassword(req.body.password);
			if (!validPassword) {

				res.json({

					sucess: false,
					message: "Authentication failed.Wrong password."
				});
			} else {

			 	// user found and correct password create a token

			 	 var token = jwt.sign({

			 	 	name: user.firstname,
			 	 	username: user.username

			 	 }, superSecret, {

			 	 	expiresInMinutes: 1440 // expires in 24 hrs
			 	 });

			 	 // return the information including token as JSON
				res.json({
				success: true,
				message: 'Enjoy your token!', 
				token: token
			  })
			}
	   	}

	});

});


// middleware to use for all requests
apiRouter.use(function(req, res, next) {


	//check  header or url parameters or post parameters for token

	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	//deconde token

	if (token) {

		//verifies secret and checks exp

		jwt.verify(token, superSecret, function(err, decoded) {

			if (err) {

				return res.status(403).send({

					success: false,
					message: "Failed to authenticate token."
				});
			} else {
				// if everything is good, save to request for use in other routes
			  req.decoded = decoded;

			  next();

			}
		});

	} else {
		// if there is no token
		// return an HTTP response of 403 (access forbidden) and an error message return res.status(403).send({
		return res.status(403).send({
			success: false,
  			message: 'No token provided.'
		});
	}

	// do logging
	console.log('Somebody just came to our app!');
	 // make sure we go to the next routes and don't stop here
});



// test route to make sure everything is working 
// accessed at GET http://localhost:8080/api
apiRouter.get('/', function(req, res) {
	res.json({ message: 'hooray! welcome to our api!' });	
});

// on routes that end in /users
// ----------------------------------------------------
apiRouter.route('/users')

	// create a user (accessed at POST http://localhost:8080/users)
	.post(function(req, res) {
		
		var user = new User();		// create a new instance of the User model
		user.firstname = req.body.firstname;  // set the users name (comes from the request)
		user.secondname = req.body.secondname;  // set the users username (comes from the request)
		user.username = req.body.username;  // set the users password (comes from the request)
		user.password = req.body.password;
		user.dob = req.body.dob;
		user.position1 = req.body.position1;
		user.position2 = req.body.position2;
		user.address = req.body.address;
		user.email = req.body.email;
		user.mob = req.body.mob;  

		user.save(function(err) {
			//if (err) return res.send(err);
			if (err) {
				// duplicate entry
				if (err.code == 11000) 
					return res.json({ success: false, message: 'A user with that username already exists. '});
				else 
					return res.send(err);
				}
 
 			// return a message
 			res.json({ message: 'User created!' });
		});

	})

	// get all the users (accessed at GET http://localhost:8080/api/users)
	.get(function(req, res) {
		User.find(function(err, users) {
			if (err) return res.send(err);

			// return the users
			res.json(users);
		});
	});

// on routes that end in /users/:user_id
// ----------------------------------------------------
apiRouter.route('/users/:user_id')

	// get the user with that id
	.get(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {
			if (err) return res.send(err);

			// return that user
			res.json(user);
		});
	})

	// update the user with this id
	.put(function(req, res) {
		User.findById(req.params.user_id, function(err, user) {

			if (err) return res.send(err);

			// set the new user information if it exists in the request
			if (req.body.firstname) user.firstname = req.body.firstname;
			if (req.body.secondname) user.secondname = req.body.secondname;
			if (req.body.username) user.username = req.body.username;
			if (req.body.password) user.password = req.body.password;
			if (req.body.dob) user.dob = req.body.dob;
			if (req.body.position1) user.position1 = req.body.position1;
			if (req.body.position2) user.position2 = req.body.position2;
			if (req.body.address) user.address = req.body.address;
			if (req.body.email) user.email = req.body.email;
			if (req.body.mob) user.mob = req.body.mob;  

			// save the user
			user.save(function(err) {
				if (err) return res.send(err);

				// return a message
				res.json({ message: 'User updated!' });
			});

		});
	})

	// delete the user with this id
	.delete(function(req, res) {
		User.remove({
			_id: req.params.user_id
		}, function(err, user) {
			if (err) return res.send(err);

			res.json({ message: 'Successfully deleted' });
		});
	});


// api end point to get user information

apiRouter.get('/me', function(req,res) {

	res.send(req.decoded);

});

// REGISTER OUR ROUTES -------------------------------
app.use('/api', apiRouter);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);