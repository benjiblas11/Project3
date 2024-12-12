const express = require('express');
const { watchFile } = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Knex configuration
app.use(express.urlencoded( {extended: true} )); 
const knex = require("knex") ({
  client : "pg",
  connection : {
  host : process.env.RDS_HOSTNAME || "awseb-e-vbny7unsnr-stack-awsebrdsdatabase-q6rrminxrmbe.cn6220qmsuba.us-east-1.rds.amazonaws.com",
  user : process.env.RDS_USERNAME || "cb4udie",
  password : process.env.RDS_PASSWORD || "iloveproject3",
  database : "CB4Udie",
  port : process.env.RDS_PORT || 5432,
  ssl: { require: true, rejectUnauthorized: false } // Fixed line
  // ssl: process.env.DB_SSL ? {rejectUnauthorized: false } : false  // WRONG LINE 
}
})

//db = knex
const db = knex;

// pleeeaaasse work
let userId = 0;

// Middleware for URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to ensure authentication
function ensureAuthenticated(req, res, next) {
    if (req.session.user_id) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Route for the home page (root route)
app.get('/', (req, res) => {
    res.redirect('/login'); // Or render a homepage like res.render('home');
});

// Route to show the Sign Up page
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Route to show the Login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Route to show the Movies page
app.get('/movies', async (req, res) => {
    if (!req.query.user_id) {
        return res.redirect('/login'); // Redirect to login if user_id is missing
    }

    userId = req.query.user_id; // Set userId from query parameter

    try {
        const movie_info = await db('movie_info').select('*').orderBy('movie_rank', 'asc');
        const user_movies = await db('movies_watched').where({ user_id: userId });

        res.render('movies', { movie_info, user_movies, userId, unwatched: req.query.unwatched });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving movies.');
    }
});

// FILTER BY UNWATCHED
app.get('/filterunwatched', async (req, res) => {
    const unwatched = req.query.unwatched === 'true';
    const userId = parseInt(req.query.user_id); // Ensure user_id is an integer

    if (!userId) {
        return res.redirect('/login'); // Redirect to login if user_id is missing
    }

    try {
        let result;
        if (unwatched) {
            result = await knex('movie_info')
                .select('movie_info.*')
                .leftJoin('movies_watched', function() {
                    this.on('movie_info.movie_rank', '=', 'movies_watched.movie_rank')
                        .andOn('movies_watched.user_id', '=', userId); // Use integer userId
                })
                .where(function() {
                    this.where('movies_watched.watched_status', false)
                        .orWhere('movies_watched.watched_status', null);
                });
        } else {
            result = await knex('movie_info').select('*');
        }

        console.log(result); // Log the result to inspect it
        res.render('movies', { movie_info: result, userId, unwatched: req.query.unwatched });
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Server Error');
    }
});



// Handle Sign Up form submission
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        await db('user_info').insert({ username, password }); // Assuming you have a 'users' table
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating user.');
    }
});

// Handle Login form submission
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db('user_info').where({ username, password }).first();

        if (user) {
            // Redirect with user_id as a query parameter
            res.redirect(`/movies?user_id=${user.user_id}`);
        } else {
            res.send('Invalid credentials');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error logging in.');
    }
});

(async () => {
    try {
        const result = await db.raw('SELECT 1+1 AS result'); // Simple query to test connection
        console.log("Database connected successfully:", result.rows);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
  })();

// view_movie route
    app.get('/view_movie/:id', async (req, res) => {
        const  id  = req.params.id; // Movie rank is assumed to be the `id`
        // const userId = req.session.user_id || 1; // Replace with your actual user management system

    try {
        // Fetch movie details from the `movie_info` table
        const movie = await db('movie_info').where('movie_rank', id ).first();

        if (!movie) {
            return res.status(404).send('Movie not found.');
        }

        // Fetch user-specific data from the `movies_watched` table
        const user = await db('movies_watched')
            // .where({ movie_rank: id, user_id: userId })
            .where( 'user_id', userId).where('movie_rank', id)
            .first();

        // Fetch reviews for the movie 
        const reviews = await db('movies_watched') 
        .select('movie_review') 
        .where('movie_rank', id)
        .where('watched_status', true)
        .limit(3); 

        res.render('view_movie', { 
        movie, 
        user, // Pass empty object if no entry exists 
        reviews // Pass reviews to the EJS file 
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading movie details.');
    }
});

app.post('/add_review', async (req, res) => {
    const { movie_rank, watched_status, user_rating, movie_review } = req.body;
    

    try {
        // Update the user's review and rating
        await db('movies_watched')
            .where({ movie_rank: movie_rank, user_id: parseInt(userId) })
            .update({
                watched_status: watched_status || false,
                user_rating: user_rating,
                movie_review: movie_review
            });

        res.redirect(`/view_movie/${movie_rank}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating review.');
    }
});

// SEARCH MOVIES ---------------------------------------------------------------------------------------------------------
app.get('/search', async (req, res) => {
    const query = req.query.query;
    const userId = req.query.user_id; // Retrieve userId from query parameters
    const unwatched = req.query.unwatched; // Retrieve unwatched value (if any)
  
    if (!userId) {
      return res.redirect('/login'); // Redirect to login if user_id is missing
    }
  
    try {
      // Search logic based on the query
      const result = await knex('movie_info').select('*').where('title', 'ILIKE', `%${query}%`);
      
      // Pass userId and unwatched to the view
      res.render('movies', { movie_info: result, userId, unwatched });
    } catch (err) {
      console.error('Error executing search query', err.stack);
      res.status(500).send('Server Error');
    }
});

// FILTER BY DIRECTOR ---------------------------------------------------------------------------------------------------------
app.get('/filterdir', async (req, res) => { 
    const director = req.query.director;
    const userId = req.query.user_id; // Retrieve userId from query parameters

    if (!userId) {
        return res.redirect('/login'); // Redirect to login if user_id is missing
    }

    try {
        let result;
        if (director === 'all') {
            result = await knex('movie_info').select('*');
        } else {
            result = await knex('movie_info')
                .select('*')
                .where('director', 'ILIKE', `%${director}%`);
        }
        
        console.log(result); // Log the result to inspect it
        res.render('movies', {
            movie_info: result,
            userId, // Pass userId to the EJS template
            unwatched: req.query.unwatched || '', // Ensure unwatched is passed even if undefined
        });
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Server Error');
    }
});



app.get('/filterrat', async (req, res) => { 
    const mpaa_rating = req.query.mpaa_rating;
    const userId = req.query.user_id; // Retrieve userId from query parameters
    const unwatched = req.query.unwatched; // Retrieve unwatched from query parameters
  
    if (!userId) {
        return res.redirect('/login'); // Redirect to login if user_id is missing
    }
  
    try {
      let result;
      if (mpaa_rating === 'all') {
        result = await knex('movie_info').select('*');
      } else {
        result = await knex('movie_info')
          .select('*')
          .where('mpaa_rating', '=', mpaa_rating);
      }
  
      console.log(result); // Log the result to inspect it
      res.render('movies', { movie_info: result, userId, unwatched }); // Pass userId and unwatched to the view
    } catch (err) {
      console.error('Error executing query', err.stack);
      res.status(500).send('Server Error');
    }
  });
  


// FILTER BY DECADE ---------------------------------------------------------------------------------------------------------
app.get('/filterdec', async (req, res) => {
    const unwatched = req.query.unwatched === 'true';  // Ensure 'unwatched' is boolean
    const userId = parseInt(req.query.user_id); // Ensure user_id is an integer

    if (!userId) {
        return res.redirect('/login'); // Redirect to login if user_id is missing
    }

    try {
        let result;
        const year = req.query.year || 'all';  // Default to 'all' if no year is selected

        if (unwatched) {
            result = await knex('movie_info')
                .select('movie_info.*')
                .leftJoin('movies_watched', function() {
                    this.on('movie_info.movie_rank', '=', 'movies_watched.movie_rank')
                        .andOn('movies_watched.user_id', '=', userId); // Use integer userId
                })
                .where(function() {
                    this.where('movies_watched.watched_status', false)
                        .orWhere('movies_watched.watched_status', null);
                });
        } else {
            result = await knex('movie_info').select('*');
        }

        // Filter by decade if a specific year is selected
        if (year !== 'all') {
            result = result.filter(movie => movie.year >= parseInt(year) && movie.year < parseInt(year) + 10);
        }

        res.render('movies', { 
            movie_info: result, 
            userId, 
            unwatched: req.query.unwatched || ''  // Ensure unwatched is passed as an empty string if not defined
        });
    } catch (err) {
        console.error('Error executing query', err.stack);
        res.status(500).send('Server Error');
    }
});

  

//Test

// Start the server
app.listen(PORT, () => {
    console.log(process.env.RDS_HOSTNAME)
    console.log(`Server is running on http://localhost:${PORT}`);
});