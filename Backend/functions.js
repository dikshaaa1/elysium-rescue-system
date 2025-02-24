const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
require('dotenv').config();
const cron = require('node-cron');
const userActivity = {};
const updateUserActivity = async (userId) => {
    userActivity[userId] = Date.now();
    await updateStatus({ userId, status: 'online' });
};


//set status to offline if api calls are not getting made
cron.schedule('*/10 * * * * *', async () => { // Run every 10 seconds
    console.log("Checking user activity...");
    const now = Date.now();
    for (const userId in userActivity) {
        if (now - userActivity[userId] > 20 * 1000) { // 20 seconds
            await updateStatus({ userId, status: 'offline' });
            delete userActivity[userId];
        }
    }
});


// Mongoose connection
mongoose.connect(process.env.MONGODB_URI, {
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('Connection error', err);
});

const saltRounds = 10;

// Define the User schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: Number, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: '' },
    profilePic: { type: String, default: '' },
    address: { type: String, default: '' },
    bloodGroup: { type: String, default: '' },
    userType: { type: String, required: true },
    lastLoc: { 
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
    },
    emergencyHistory: { type: [String], default: [] },
    medicalHistory: { type: [String], default: [] },
    emergencyContact: {
        username: { type: String, default: '' },
        phone: { type: Number, default: 0 }
    },
    locale: { type: String, default: '' },
    license: { type: Number, default: 0 },
    vehicleInfo: {
        brand: { type: String, default: '' },
        model: { type: String, default: '' },
        color: { type: String, default: '' },
        rc: { type: String, default: '' },
        insurance: { type: String, default: '' }
    },
    identificationMark: { type: String, default: '' },
    aadhaar: { type: Number, default: 0 },
    futureLoc: {
        location: { type: String, default: '' },
        time: { type: String, default: '' }
    },
    testStatus: { type: String, default: '' },
    sosType: { type: String, default: '' },
    picture: { type: String, default: '' },
    currentStatus: { type: String, enum: ['online', 'offline'], default: 'offline' }
});


// Create a 2dsphere index on the lastLoc field
userSchema.index({ lastLoc: '2dsphere' });
const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  });

// Function to filter out default values
const filterDefaults = (user, schema) => {
    const filteredUser = {};
    for (let key in user) {
        
    console.log(schema[key]);
    console.log(schema[key].default);
        if (user[key] !== schema[key].default) {
            filteredUser[key] = user[key];
        }
    }
    return filteredUser;
};

const validateDetails = (details, fieldsToValidate) => {
    const passwordComplexity = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    const validations = {
        name: value => {
            if (!value) throw new Error('Name is required');
        },
        phone: value => {
            if (!value) throw new Error('Phone number is required');
            if (!validator.isMobilePhone(""+value, 'any')) throw new Error('Invalid phone number');
        },
        email: value => {
            if (!value) throw new Error('Email address is required');
            if (!validator.isEmail(value)) throw new Error('Invalid email address');
        },
        password: value => {
            if (!value) throw new Error('Password is required');
            if (!validator.isLength(value, { min: 8 })) throw new Error('Password must be at least 8 characters long');
            if (!passwordComplexity.test(value)) throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
        },
        userType: value => {
            if (!value) throw new Error('User type is required');
        }
    };

    if (!Array.isArray(fieldsToValidate)) {
        fieldsToValidate = [fieldsToValidate];
    }

    fieldsToValidate.forEach(field => {
        if (!validations[field]) {
            throw new Error(`Unknown field: ${field}`);
        }
        validations[field](details[field]);
    });

    return true;
};

const hashPassword = async (password) => {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
};

const userExists = async ({ phone, email }) => {
    const user = await User.findOne({ $or: [{ phone }, { email }] });
    return user !== null;
};

// Function to delete a user
const deleteUser = async ({ phone, email }) => {
    validateDetails({ phone, email }, ['phone', 'email']);
    const result = await User.deleteOne({ $or: [{ phone }, { email }] });
    if (result.deletedCount === 0) {
        throw new Error('No user found with the provided phone number or email');
    }
    return result;
};

// Function to update user details
const updateUser = async ({ phone, email, updateData }) => {
    // Hash the password if it's being updated
    if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    // Find and update the user
    const user = await User.findOneAndUpdate(
        { $or: [{ phone }, { email }] },
        updateData,
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error('No user found with the provided phone number or email');
    }

    // Filter out default values before returning the user
    const filteredUser = filterDefaults(user.toObject(), userSchema.paths);
    console.log(filteredUser);
    return filteredUser;
};

// Function to sign in a user
const userSignIn = async ({ email, password, lat, long }) => {
    validateDetails({ email, password }, ['email', 'password']);
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('No user found with the provided phone number or email');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Incorrect password');
    }

    return updateLocation({ userId: user._id, lat, long });
};

// Function to sign up a user or volunteer
const signUp = async ({ name, phone, email, password, userType, lat, long }) => {
    // Determine required fields based on userType
    const requiredFields = ['name', 'phone', 'email', 'password', 'userType'];

    // Create an object for validation
    const userDetails = { name, phone, email, userType };
    if (userType !== 'volunteer') {
        userDetails.password = password;
    }
    else {
        password = generateRandomPassword()        
        userDetails.password = password;
    }

    // Validate the details based on the required fields
    validateDetails(userDetails, requiredFields);

    // Check if the user already exists
    if (await userExists({ phone, email })) {
        throw new Error('User already exists with the provided phone number or email');
    }

    // Hash the password if provided (i.e., for non-Volunteer sign-ups)
    const hashedPassword = await hashPassword(password);

    // Create a new user or volunteer
    const user = new User({
        name,
        phone,
        email,
        password: hashedPassword,
        userType,
        lastLoc: { type: 'Point', coordinates: [long, lat] }
    });

    if(userType === 'volunteer') {
        sendPasswordEmail(email, userDetails.password);
    }
    // Save the user or volunteer to the database
    await user.save();

    return user;
};

// Function to list all users (excluding volunteers)
const listUsers = async () => {
    const users = await User.find({ userType: { $ne: 'volunteer' } });
    return users;
};

// Function to list all victims within a certain radius
const listVictims = async ({ lat, long, radius }) => {
    const victims = await findUsersWithinRadius({lat, long, radius});
    return victims;
};

// Function to list all volunteers
const listVolunteers = async () => {
    const volunteers = await User.find({ userType: 'volunteer' });
    return volunteers;
};

// Function to find users within a certain radius
const findUsersWithinRadius = async ({ lat, long, radius, userType }) => {
    if(userType){
        const users = await User.find({
            userType: userType,
            lastLoc: {
                $geoWithin: {
                    $centerSphere: [
                        [long, lat], // [longitude, latitude]
                        radius / 6371000 // radius in radians (radius in meters / Earth's radius in meters)
                    ]
                }
            }
        });
        return users;
    }
    else{
        const victims = await User.find({
            sosType: { $ne: '' },
            lastLoc: {
                $geoWithin: {
                    $centerSphere: [
                        [long, lat], // [longitude, latitude]
                        radius / 6371000 // radius in radians (radius in meters / Earth's radius in meters)
                    ]
                }
            }
        });
        return victims;
    }
};

// Function to update a user's location
const updateLocation = async ({ userId, lat, long }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { lastLoc: { type: 'Point', coordinates: [long, lat] } },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error('No user found with the provided ID');
    }

    return user;
};

const generateRandomPassword = () => {
    const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
    const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '@$!%*?&';
  
    const getRandomChar = (charset) => charset[Math.floor(Math.random() * charset.length)];
  
    let password = '';
    password += getRandomChar(lowerCase);
    password += getRandomChar(upperCase);
    password += getRandomChar(numbers);
    password += getRandomChar(specialChars);
  
    const allChars = lowerCase + upperCase + numbers + specialChars;
  
    for (let i = password.length; i < 12; i++) {
      password += getRandomChar(allChars);
    }
  
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  };

// Function to send an email with the random password
const sendPasswordEmail = async (recipientEmail, password) => {
    var mailOptions = {
        from: process.env.MAIL_USERNAME,
        to: recipientEmail,
        subject: 'Thanks for Volunteering! Here is Your New Password',
        text: `Dear Volunteer,

            Thank you for joining our volunteer program. Your contribution is highly appreciated!

            Here is your new password: ${password}

            We are excited to have you on board and look forward to your valuable participation.

            Best Regards,
            Elysium Inc.`
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            throw new Error(error);
        }
    });
};

const updateStatus = async ({ userId, status }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { currentStatus: status },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error('No user found with the provided ID');
    }

    return user;
};

// Function to update SOS status and location
const updateSOSStatus = async ({ userId, sosType, lat, long, picture }) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
    }

    const user = await User.findByIdAndUpdate(
        userId,
        {
            sosType,
            lastLoc: { type: 'Point', coordinates: [long, lat] },
            picture // Assuming picture is a URL or path to the stored image
        },
        { new: true, runValidators: true }
    );

    if (!user) {
        throw new Error('No user found with the provided ID');
    }

    return user;
};





module.exports = {
    signUp,
    userSignIn,
    deleteUser,
    updateUser,
    listUsers,
    listVolunteers,
    findUsersWithinRadius,
    updateLocation,
    updateUserActivity,
    listVictims,
    updateSOSStatus
};
