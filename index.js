const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Knex configuration
app.use(express.urlencoded( {extended: true} )); 
const knex = require("knex") ({
  client : "pg",
  connection : {
  host : process.env.RDS_HOSTNAME || "awseb-e-dcpssqafyh-stack-awsebrdsdatabase-ofssl7nxdyot.cn6220qmsuba.us-east-1.rds.amazonaws.com",
  user : process.env.RDS_USERNAME || "ebroot",
  password : process.env.RDS_PASSWORD || "iloveintex",
  database : "CB4Udie",
  port : process.env.RDS_PORT || 5432,
  ssl: { require: true, rejectUnauthorized: false } // Fixed line
  // ssl: process.env.DB_SSL ? {rejectUnauthorized: false } : false  // WRONG LINE 
}
})

//db = knex
const db = knex;

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
    try {
        const movie_info = await db('movie_info').select('*').orderBy('movie_rank', 'asc'); // Assuming you have a 'movies' table
        res.render('movies', { movie_info });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving movies.');
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
            res.redirect('/movies');
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
    const id  = req.params.id; // Movie rank is assumed to be the `id`
    // const userId = req.session.user_id || 1; // Replace with your actual user management system

    try {
        // Fetch movie details from the `movie_info` table
        const movie = await db('movie_info').where({ movie_rank: id }).first();

        if (!movie) {
            return res.status(404).send('Movie not found.');
        }

        // Fetch user-specific data from the `movies_watched` table
        const userInfo = await db('movies_watched')
            .where({ movie_rank: id, user_id: userId })
            .first();

        res.render('view_movie', {
            movie,
            user: userInfo || {}, // Pass empty object if no entry exists
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading movie details.');
    }
});

app.post('/update_status', async (req, res) => {
    const { movie_rank, watched_status } = req.body;
    const userId = req.session.user_id || 1; // Replace with your user management logic

    try {
        // Update the watched status
        await db('movies_watched')
            .insert({ movie_rank, user_id: userId, watched_status: watched_status === 'on' })
            .onConflict(['movie_rank', 'user_id'])
            .merge();

        res.redirect(`/view_movie/${movie_rank}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating watched status.');
    }
});

app.post('/add_review', async (req, res) => {
    const { movie_rank, user_rating, movie_review } = req.body;
    const userId = req.session.user_id || 1; // Replace with your user management logic

    try {
        // Add or update the user's review and rating
        await db('movies_watched')
            .insert({ movie_rank, user_id: userId, user_rating, movie_review })
            .onConflict(['movie_rank', 'user_id'])
            .merge();

        res.redirect(`/view_movie/${movie_rank}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error adding or editing review.');
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(process.env.RDS_HOSTNAME)
    console.log(`Server is running on http://localhost:${PORT}`);
});
