const express = require('express');
const knex = require('knex');
const path = require('path');
const app = express();
const PORT = 3002;

// Knex configuration
const db = knex({
  client: 'pg',
  connection: {
    host: 'awseb-e-dcpssqafyh-stack-awsebrdsdatabase-ofssl7nxdyot.cn6220qmsuba.us-east-1.rds.amazonaws.com',
    user: 'ebroot', // Replace with your PostgreSQL username
    password: 'iloveintex', // Replace with your PostgreSQL password
    database: 'CB4Udie' // Replace with your PostgreSQL database name
  }
});

// Middleware for URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as the view engine
app.set('view engine', 'ejs');

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
        const movies = await db('movies').select('*'); // Assuming you have a 'movies' table
        res.render('movies', { movies });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving movies.');
    }
});

// Handle Sign Up form submission
app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        await db('users').insert({ username, password }); // Assuming you have a 'users' table
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
        const user = await db('users').where({ username, password }).first();

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
