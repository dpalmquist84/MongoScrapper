// var express = require("express");
// var bodyParser = require("body-parser");
// var logger = require("morgan");
// var mongoose = require("mongoose");
// var mongojs = require("mongojs");

// // Our scraping tools
// // Axios is a promised-based http library, similar to jQuery's Ajax method
// // It works on the client and on the server
// var axios = require("axios");
// var cheerio = require("cheerio");
// var request = require("request");

// // Require all models
// var db = require("./models");

// var PORT = 3001;

// // Initialize Express
// var app = express();

// // Configure middleware

// // Use morgan logger for logging requests
// app.use(logger("dev"));
// // Use body-parser for handling form submissions
// app.use(bodyParser.urlencoded({
//   extended: false
// }));
// // Use express.static to serve the public folder as a static directory
// app.use(express.static("public"));

// // Set mongoose to leverage built in JavaScript ES6 Promises
// // Connect to the Mongo DB
// mongoose.Promise = Promise;
// mongoose.connect("mongodb://localhost/scraper", {
//   useMongoClient: true
// });

// // Routes






// // First, tell the console what server.js is doing
// console.log("\n***********************************\n" +
//   "Grabbing every thread name and link\n" +
//   "from NPR's front page:" +
//   "\n***********************************\n");

// var databaseUrl = "scraper";
// var collections = ["scrapedData"];

// // Hook mongojs configuration to the db variable
// var db = mongojs(databaseUrl, collections);
// db.on("error", function (error) {
//   console.log("Database Error:", error);
// });

// // Scrape data from one site and place it into the mongodb db
// // app.get("/", function (req, res) {
// //   res.send("Hello world");
// // });

// // Retrieve data from the db
// app.get("/all", function (req, res) {
//   // Find all results from the scrapedData collection in the db
//   db.scrapedData.find({}, function (error, found) {
//     // Throw any errors to the console
//     if (error) {
//       console.log(error);
//     }
//     // If there are no errors, send the data to the browser as json
//     else {
//       res.json(found);
//     }
//   });
// });
// app.get("/scrape", function (req, res) {
//   // Make a request for the news section of ycombinator
//   request("http://npr.org/sections/news/", function (error, response, html) {
//     // Load the html body from request into cheerio
//     var $ = cheerio.load(html);
    
//     // For each element with a "title" class
//     $("h2.title").each(function (i, element) {
//       // Save the text and href of each link enclosed in the current element
//       var title = $(element).children("a").text();
//       var link = $(element).children("a").attr("href");

//       // If this found element had both a title and a link
//       if (title && link) {
//         // Insert the data in the scrapedData db
//         db.scrapedData.insert({
//             title: title,
//             link: link
//           },
//           function (err, inserted) {
//             if (err) {
//               // Log the error if one is encountered during the query
//               console.log(err);
//             } else {
//               // Otherwise, log the inserted data
//               console.log(inserted);
//             }
//           });
//       }
//     });
//   });

//   // Send a "Scrape Complete" message to the browser
//   res.send("Scrape Complete");
// });


// // Listen on port 3000
// app.listen(PORT, function () {
//   console.log(`App running on port ${PORT}!`);
// });

var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = 3002;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/scraper", {
  useMongoClient: true
});

// Routes

// A GET route for scraping the echojs website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  axios.get("http://www.npr.org/sections/news").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("h2.title").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("a")
        .text();
      result.link = $(this)
        .children("a")
        .attr("href");

      // Create a new Article using the `result` object built from scraping
      db.Article
        .create(result)
        .then(function(dbArticle) {
          // If we were able to successfully scrape and save an Article, send a message to the client
          res.send("Scrape Complete");
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          res.json(err);
        });
    });
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note
    .create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
