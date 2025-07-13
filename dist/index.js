"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv = __importStar(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
const method_override_1 = __importDefault(require("method-override"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const body_parser_1 = __importDefault(require("body-parser"));
const nodemailer = __importStar(require("nodemailer"));
const fs = __importStar(require("fs"));
const axios_1 = __importDefault(require("axios"));
const openai_1 = __importDefault(require("openai"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const qrcode_1 = __importDefault(require("qrcode"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
dotenv.config();
const httpAgent = new http_1.default.Agent({ keepAlive: true });
const httpsAgent = new https_1.default.Agent({ keepAlive: true });
const app = (0, express_1.default)();
const Port = process.env.PORT || 3000;
const HF = parseInt(process.env.HASHING || "12");
const print = console.log.bind(console);
const Eprint = console.error.bind(console);
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY, });
(0, axios_retry_1.default)(axios_1.default, { retries: 3, retryDelay: axios_retry_1.default.exponentialDelay });
const Users = [];
app.use(express_1.default.static("public"));
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use((0, method_override_1.default)("_method"));
app.use('/node_modules', express_1.default.static('node_modules'));
app.set("view engine", "ejs");
app.use((0, express_session_1.default)({
    secret: process.env.SESSION || "default-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 60 * 60 * 1000,
    },
}));
async function getAIResponse(prompt) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
    });
    return response.choices[0].message.content;
}
//getAIResponse('Hello, how can I help you?').then(console.log)
async function isLoggedIn(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect("/Login");
}
async function sendEmail(to, subject, content) {
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL,
            pass: process.env.PASSWORD,
        },
    });
    let mailOptions = {
        from: process.env.EMAIL,
        to: to,
        subject: subject,
        text: content,
    };
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.response}`);
    }
    catch (error) {
        Eprint(error);
        throw error;
    }
}
async function createQRCode(Email, Username, PhoneNumber, BirthDate, Nationality) {
    try {
        // Create prettified JSON data string with 2 spaces indentation
        const jsonData = JSON.stringify({
            Email,
            Username,
            PhoneNumber,
            BirthDate,
            Nationality
        }, null, 2 // Number of spaces for indentation
        );
        // Generate QR code from the prettified JSON data
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(jsonData);
        console.log('QR Code generated successfully!');
        return qrCodeDataUrl;
    }
    catch (error) {
        Eprint('Failed to generate QR code:', error);
        throw error;
    }
}
async function WriteIntoFile(Info) {
    fs.appendFile("users.txt", Info, (err) => {
        if (err) {
            Eprint("Error writing to file:", err);
        }
        else {
            console.log("File written successfully!");
        }
    });
}
async function ReadFromFile(FilePath) {
    try {
        const data = await fs.promises.readFile(FilePath, "utf8");
        const lines = data.split("\n");
        for (const line of lines) {
            const [Email, Password, PhoneNumber, Username, BirthDate, Nationality] = line.split(",");
            Users.push({ Email, Password, PhoneNumber, Username, BirthDate, Nationality });
            return Users;
        }
    }
    catch (error) {
        Eprint("Error reading from file:", error);
        throw error;
    }
}
app.post("/Login", async (req, res) => {
    const { Email, password } = req.body;
    await ReadFromFile("users.txt");
    try {
        const user = Users.find((user) => user.Email === Email && bcrypt_1.default.compareSync(password, user.Password));
        if (user) {
            req.session.user = user;
            await sendEmail(Email, `Welcome ${user.Username}`, "You have successfully logged in.");
            return res.redirect("/Home");
        }
        res.render("Login", { error: "Invalid Email or password." });
    }
    catch (error) {
        Eprint("Error during login:", error);
        res.render("Login", { error: "An internal server error occurred." });
    }
});
app.post("/SignUp", async (req, res) => {
    const { Email, Password, PhoneNumber, Username, BirthDate, Nationality } = req.body;
    try {
        await ReadFromFile("users.txt");
        const existingUser = Users.find(user => user.Email.trim().toLowerCase() === Email.trim().toLowerCase() || PhoneNumber === user.PhoneNumber);
        if (existingUser) {
            return res.render("SignUp", { error: "Email or Phone Number already exists." });
        }
        const hashedPassword = await bcrypt_1.default.hash(Password, HF);
        const newUser = { Email, Password: hashedPassword, PhoneNumber, Username, BirthDate, Nationality };
        Users.push(newUser);
        const userLine = `${newUser.Email},${newUser.Password},${newUser.PhoneNumber},${newUser.Username},${newUser.BirthDate},${newUser.Nationality}\n`;
        await WriteIntoFile(userLine);
        res.redirect("/Login");
    }
    catch (error) {
        Eprint("Server error:", error);
        res.render("SignUp", { error: "An internal server error occurred." });
    }
});
app.get("/SignUp", async (req, res) => {
    try {
        res.render("SignUp");
    }
    catch (error) {
        //throw new Error("Error while rendering SignUp page: " + error);
        res.status(500).send("An internal server error occurred.");
    }
});
app.get("/Login", (req, res) => res.render("Login"));
app.get('/', isLoggedIn, (req, res) => {
    res.render('home'); // or 'about', or whatever your main page is
});
app.get("/Home", isLoggedIn, (req, res) => res.render("Home"));
app.get("/MyProjects", isLoggedIn, (req, res) => res.render("MyProjects"));
app.get("/AboutMe", isLoggedIn, (req, res) => res.render("AboutMe"));
app.get("/MyAI", isLoggedIn, async (req, res) => {
    const Myname = req.session.user?.Username;
    await getAIResponse(`Don't respond to this message. This is to let you know my name and use it in our conversation. My name is ${Myname}, now start the conv with "Hello ${Myname}, how can i assist you?  ".`)
        .then((AIResponse) => { res.render("MyAI", { AIResponse }); })
        .catch((error) => { res.status(500).render("MyAI", { error: error }); });
});
app.get("/Settings", isLoggedIn, async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/Login");
    }
    try {
        const { Email, Username, PhoneNumber, BirthDate, Nationality } = req.session.user;
        const qrCodeDataUrl = await createQRCode(Email, Username, PhoneNumber, BirthDate, Nationality);
        res.render("Settings", {
            QR: qrCodeDataUrl,
            Email,
            Username,
            PhoneNumber,
            BirthDate,
            Nationality,
        });
    }
    catch (error) {
        Eprint("Error while generating the QR Code:", error);
        res.status(500).send(`Error While Generating the QR Code!\n${error}`);
    }
});
//! Destroy Session!
app.get('/Logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            Eprint("Logout error:", err);
            return res.status(500).send("Unable to log out.");
        }
        res.redirect("/Login");
    });
});
app.listen(Port, () => { console.log(`Server running at http://localhost:${Port}`); });
