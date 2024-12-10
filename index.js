let express = require('express');
let app = express();
let path = require('path');
const PORT = process.env.PORT || 3000

// grab html form from file 
// allows to pull JSON data from form 
app.use(express.urlencoded( {extended: true} )); 
const knex = require("knex") ({
  client : "pg",
  connection : {
  host : process.env.RDS_HOSTNAME || "awseb-e-dcpssqafyh-stack-awsebrdsdatabase-ofssl7nxdyot.cn6220qmsuba.us-east-1.rds.amazonaws.com",
  user : process.env.RDS_USERNAME || "ebroot",
  password : process.env.RDS_PASSWORD || "iloveintex",
  database : process.env.RDS_DB_NAME || "ebdb",
  port : process.env.RDS_PORT || 5432,
  ssl: { require: true, rejectUnauthorized: false } // Fixed line
  // ssl: process.env.DB_SSL ? {rejectUnauthorized: false } : false  // WRONG LINE 
}
})
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));
// Define route for home page

// LOAD THE HOME PAGE
app.get('/', (req, res) => {
  res.render('index');  // Renders 'login.ejs' file
});

app.use(express.json()); // CHECK LINE
// Serve static files (e.g., CSS) if needed
app.use(express.static('public'));
// port number, (parameters) => what you want it to do.


// PORT LISTENING-----------------------------------------------------------------------------
app.listen(PORT, () => console.log('Server started on port ' + PORT));