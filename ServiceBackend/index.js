const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path"); // Useful for resolving paths
const { exec } = require("child_process");
const { jsonrepair } = require("jsonrepair");

// Load environment variables from .env file
dotenv.config();

const sosMode = process.env.SOSMODE || "static"; // Default to "static" if SOSMODE is not set
const twitterMode = process.env.TWITTERMODE || "static"; // Default to "static" if TWITTERMODE is not set

const staticFolderPath = path.join(__dirname, "static");
const geminiPostsFilePath = path.join(__dirname, "XPyAPI", "Gemini_Posts.json");
const pythonScriptPath = path.join(__dirname, "XPyAPI", "TwitterNew.py");
const staticGeminiPostsPath = path.join(
    staticFolderPath,
    "Static_Gemini_Posts.json"
);
const staticSOSPostsPath = path.join(staticFolderPath, "Static_SOS_Posts.json");

let lastExecutionTime = 0;
const cacheDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
let cachedData = null;

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Failed to connect to MongoDB:", err));

// Define the User model
const User = mongoose.model(
    "User",
    new mongoose.Schema({
        name: { type: String, required: true },
        phone: { type: Number, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, default: "" },
        profilePic: { type: String, default: "" },
        address: { type: String, default: "" },
        bloodGroup: { type: String, default: "" },
        userType: { type: String, required: true },
        lastLoc: {
            type: { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], default: [0, 0] },
        },
        emergencyHistory: { type: [String], default: [] },
        medicalHistory: { type: [String], default: [] },
        emergencyContact: {
            username: { type: String, default: "" },
            phone: { type: Number, default: 0 },
        },
        locale: { type: String, default: "" },
        license: { type: Number, default: 0 },
        vehicleInfo: {
            brand: { type: String, default: "" },
            model: { type: String, default: "" },
            color: { type: String, default: "" },
            rc: { type: String, default: "" },
            insurance: { type: String, default: "" },
        },
        identificationMark: { type: String, default: "" },
        aadhaar: { type: Number, default: 0 },
        futureLoc: {
            location: { type: String, default: "" },
            time: { type: String, default: "" },
        },
        testStatus: { type: String, default: "" },
        sosType: { type: String, default: "" },
        picture: { type: String, default: "" },
        currentStatus: {
            type: String,
            enum: ["online", "offline"],
            default: "offline",
        },
    })
);

// Create the Express app
const app = express();

// Allow all CORS requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Middleware to log all requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Function to serve static Gemini_Posts.json or Static_SOS_Posts.json
const serveStaticData = (filePath, res) => {
    fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading static file:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        try {
            const jsonData = JSON.parse(data);
            res.json(jsonData);
        } catch (parseErr) {
            console.error("Error parsing JSON:", parseErr);
            res.status(500).json({ error: "Error parsing JSON" });
        }
    });
};

// Function to run the Python script
const runPythonScript = (callback) => {
    exec(`python "${pythonScriptPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing Python script: ${error.message}`);
            return callback(error, null);
        }
        if (stderr) {
            console.error(`Python script stderr: ${stderr}`);
        }
        console.log(`Python script stdout: ${stdout}`);
        if (fs.existsSync(geminiPostsFilePath)) {
            console.log("Gemini_Posts.json exists. Repairing JSON...");

            // Read the file as text
            fs.readFile(geminiPostsFilePath, "utf8", (err, data) => {
                if (err) {
                    console.error(
                        `Error reading Gemini_Posts.json: ${err.message}`
                    );
                    return callback(err, null);
                }

                try {
                    // Repair the JSON using jsonrepair
                    const repairedJson = jsonrepair(data);

                    // Write the repaired JSON back to the same file
                    fs.writeFile(
                        geminiPostsFilePath,
                        repairedJson,
                        "utf8",
                        (writeErr) => {
                            if (writeErr) {
                                console.error(
                                    `Error writing repaired JSON to Gemini_Posts.json: ${writeErr.message}`
                                );
                                return callback(writeErr, null);
                            }

                            console.log(
                                "Repaired JSON written to Gemini_Posts.json successfully."
                            );

                            callback(null, stdout);
                        }
                    );
                } catch (repairError) {
                    console.error(
                        `Error repairing JSON: ${repairError.message}`
                    );
                    return callback(repairError, null);
                }
            });
        } else {
            callback(null, stdout);
        }
    });
};

// Route to handle /service/getx based on TWITTERMODE
app.post("/service/getx", (req, res) => {
    if (twitterMode === "static") {
        console.log("TWITTERMODE: static - Serving Static_Gemini_Posts.json");
        serveStaticData(staticGeminiPostsPath, res);
    } else if (twitterMode === "live") {
        console.log("TWITTERMODE: live - Running Python script");

        const currentTime = Date.now();

        // If the script was run within the last 5 minutes, serve the cached data
        if (currentTime - lastExecutionTime < cacheDuration && cachedData) {
            console.log("Serving cached data...");
            return res.json(cachedData);
        }

        // Otherwise, run the Python script and serve the updated data
        runPythonScript((err) => {
            if (err) {
                console.error("Error running Python script");
                return res.status(500).json({ error: "Internal server error" });
            }

            lastExecutionTime = currentTime;

            // Read and serve the updated JSON data
            fs.readFile(geminiPostsFilePath, "utf8", (err, data) => {
                if (err) {
                    console.error("Error reading file:", err);
                    return res
                        .status(500)
                        .json({ error: "Internal server error" });
                }

                try {
                    cachedData = JSON.parse(data); // Update the cache with new data
                    res.json(cachedData);
                } catch (parseErr) {
                    console.error("Error parsing JSON:", parseErr);
                    res.status(500).json({ error: "Error parsing JSON" });
                }
            });
        });
    }
});

// Automatically run the Python script every 5 minutes if TWITTERMODE is live
if (twitterMode === "live") {
    setInterval(() => {
        console.log("Automatically running Python script...");
        runPythonScript((err) => {
            if (!err) {
                fs.readFile(geminiPostsFilePath, "utf8", (err, data) => {
                    if (!err) {
                        try {
                            cachedData = JSON.parse(data); // Refresh cache
                            console.log("Data cache updated.");
                        } catch (parseErr) {
                            console.error(
                                "Error parsing JSON during auto-update:",
                                parseErr
                            );
                        }
                    }
                });
            }
        });
    }, cacheDuration);
}

// Route to check if email exists in the database
app.post("/service/login", async (req, res) => {
    const { email } = req.body;

    try {
        let user = {};
        if (email) {
            user = {
                email: "user@example.com",
                password: "testpassA@1",
                servicename: "National Disaster Response Force",
                totalServiceCompleted: 250,
                serviceCompletedToday: 5,
                runningServices: {
                    count: 3,
                    names: ["Delhi", "Mumbai", "Chennai"],
                },
                pendingServices: {
                    count: 2,
                    names: ["Rajisthan", "Haryana"],
                },
            };
            res.json(user);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to save user info in the database
app.post("/service/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = new User({ email, password });
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Route to handle /service/getsos based on SOSMODE
app.post("/service/getsos", async (req, res) => {
    if (sosMode === "static") {
        console.log("SOSMODE: static - Serving Static_SOS_Posts.json");
        serveStaticData(staticSOSPostsPath, res);
    } else if (sosMode === "live") {
        console.log("SOSMODE: live - Fetching SOS data from MongoDB");

        try {
            const usersWithSOS = await User.find({ sosType: { $ne: "" } });

            if (usersWithSOS.length === 0) {
                return res.status(404).json({ error: "No SOS data found" });
            }

            res.json(usersWithSOS);
        } catch (error) {
            console.error("Error fetching SOS details:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }
});

// Start the server using the port from .env
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
