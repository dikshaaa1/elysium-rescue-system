const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { signUp, deleteUser, updateUser, userSignIn, listUsers, listVolunteers, findUsersWithinRadius, updateLocation, updateUserActivity, listVictims, updateSOSStatus } = require('./functions'); // Import functions

const fs = require('fs');

const app = express();
// Middleware
app.use(bodyParser.json({ limit: '10mb' })); // Increase payload size to 10MB
app.use(cors());

// Middleware to handle 404 errors
app.use((req, res, next) => {
    console.log(req.path);
    console.log(req.body);
    fs.writeFileSync('./test.txt', JSON.stringify(req.body, null, 2));
    next();
});
// Routes

app.post("/signup", async (req, res) => {
    const { name, phone, email, password, type:userType, lat, lng:long } = req.body;       
    try {
        const user = await signUp({ name, phone, email, password, userType, lat, long });
        res.status(201).send(user);
    } catch (err) {
        console.log(err.message);
        res.status(400).send(err.message);
    } 
})

app.post('/delete', async (req, res) => {
    const { phone, email } = req.body;

    try {
        await deleteUser({ phone, email });
        res.status(200).send('User deleted successfully');
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/update', async (req, res) => {
    const { phone, email, updateData } = req.body;

    try {
        const user = await updateUser({ phone, email, updateData });
        res.status(200).send(`User updated: ${user}`);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/signin', async (req, res) => {
    const { email, password, lat, lng:long } = req.body;

    try {
        const user = await userSignIn({ email, password, lat, long });
        res.status(200).send(user);
    } catch (err) {
        console.log(err.message);
        res.status(400).send(err.message);
    }
});

// List all users
app.post('/users', async (req, res) => {
    try {
        const users = await listUsers();
        res.status(200).send(users);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// List all volunteers
app.post('/volunteers', async (req, res) => {
    try {
        const volunteers = await listVolunteers();
        res.status(200).send(volunteers);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Route to find users within a certain radius
app.post('/beacon', async (req, res) => {
    const { lat, lng:long, radius, type:userType } = req.body;
    console.log(lat);
    console.log(long);
    console.log(radius);
    console.log(userType);

    try {
        const users = await findUsersWithinRadius({ lat, long, radius, userType });
        res.status(200).send(users);
    } catch (err) {
        res.status(400).send(err.message);
    }
});


// Route to update a user's location
app.post('/updatelocation', async (req, res) => {
    const { userId, lat, long } = req.body;

    try {
        await updateUserActivity(userId);
        const user = await updateLocation({ userId, lat, long });        
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/victims', async (req, res) => {
    try {
        const { userId, lat, lng:long } = req.body;
        if (userId) {
            await updateUserActivity(userId);
            await updateLocation({ userId, lat, long })
            const victims = await listVictims({lat, long, radius:5000}); //5km
            res.status(200).send(victims);
        }
        else{
            res.status(400).send('User ID is required');
        }
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Route to update SOS status and location
app.post('/sos', async (req, res) => {
    const { userId, sosType, lat, lng: long, picture } = req.body;
    try {
        const user = await updateSOSStatus({ userId, sosType, lat, long, picture });
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Route to Complete SOS
app.post('/completesos', async (req, res) => {
    const { userId, lat, lng: long } = req.body;
    try {
        const user = await updateSOSStatus({ userId, sosType:"", lat, long, picture:"" });
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Route to Car crash
app.post('/crashdetection', async (req, res) => {
    const { userId, lat, lng: long } = req.body;
    try {
        const user = await updateSOSStatus({ userId, sosType:"carCrash", lat, long, picture });
        res.status(200).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

// Middleware to handle 404 errors
app.use((req, res, next) => {
    res.status(404).send('404 Not Found');
});


// Middleware to handle 404 errors
app.use((req, res, next) => {
    res.status(404).send('404 Not Found');
});

// Start the server
const port = 4000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
