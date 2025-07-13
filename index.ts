import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import session from "express-session";
import methodOverride from "method-override";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import * as nodemailer from "nodemailer";
import * as fs from "fs";
import axios from "axios";
import OpenAI from 'openai';
import axiosRetry from "axios-retry";
import QRCode from 'qrcode';
import http from 'http';
import https from 'https';

dotenv.config();

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const app = express();
const Port = process.env.PORT || 3000;
const HF: number = parseInt(process.env.HASHING || "12");
const print = console.log.bind(console);
const Eprint = console.error.bind(console);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, });

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

interface User {
    Email: string;
    Password: string;
    PhoneNumber: string;
    Username: string;
    BirthDate: string;
    Nationality: string;
}

const Users: User[] = [];

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use('/node_modules', express.static('node_modules'));
app.set("view engine", "ejs");
app.use(
    session({
        secret: process.env.SESSION || "default-secret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            maxAge: 60 * 60 * 1000,
        },
    })
);

declare module 'express-session' {
    interface SessionData {
        user: User;
    }
}

async function getAIResponse(prompt: string) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
    });
    return response.choices[0].message.content;
}

//getAIResponse('Hello, how can I help you?').then(console.log)

async function isLoggedIn(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        return next();
    }
    res.redirect("/Login");
}

async function sendEmail(to: string, subject: string, content: string) {
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
    } catch (error) {
        Eprint(error);
        throw error;
    }
}

async function createQRCode(Email: string, Username: string, PhoneNumber: string, BirthDate: string, Nationality: string): Promise<string> {
    try {
        // Create prettified JSON data string with 2 spaces indentation
        const jsonData = JSON.stringify(
            {
                Email,
                Username,
                PhoneNumber,
                BirthDate,
                Nationality
            },
            null,
            2 // Number of spaces for indentation
        );

        // Generate QR code from the prettified JSON data
        const qrCodeDataUrl = await QRCode.toDataURL(jsonData);
        console.log('QR Code generated successfully!');
        return qrCodeDataUrl;
    } catch (error) {
        Eprint('Failed to generate QR code:', error);
        throw error;
    }
}



async function WriteIntoFile(Info: string): Promise<void> {
    fs.appendFile("users.txt", Info, (err) => {
        if (err) {
            Eprint("Error writing to file:", err);
        } else {
            console.log("File written successfully!");
        }
    })
}

async function ReadFromFile(FilePath: string) {
    try {
        const data = await fs.promises.readFile(FilePath, "utf8");
        const lines = data.split("\n");
        for (const line of lines) {
            const [Email, Password, PhoneNumber, Username, BirthDate, Nationality] = line.split(",");
            Users.push({ Email, Password, PhoneNumber, Username, BirthDate, Nationality });
            return Users;
        }
    } catch (error) {
        Eprint("Error reading from file:", error);
        throw error;
    }
}

app.post("/Login", async (req: Request, res: Response) => {
    const { Email, password } = req.body;
    await ReadFromFile("users.txt");
    try {
        const user = Users.find((user) => user.Email === Email && bcrypt.compareSync(password, user.Password));
        if (user) {
            req.session.user = user;
            await sendEmail(Email, `Welcome ${user.Username}`, "You have successfully logged in.");
            return res.redirect("/Home");
        }
        res.render("Login", { error: "Invalid Email or password." });
    } catch (error) {
        Eprint("Error during login:", error);
        res.render("Login", { error: "An internal server error occurred." });
    }
});

app.post("/SignUp", async (req: Request, res: Response) => {
    const { Email, Password, PhoneNumber, Username, BirthDate, Nationality } = req.body;
    try {
        await ReadFromFile("users.txt");

        const existingUser = Users.find(user => user.Email.trim().toLowerCase() === Email.trim().toLowerCase() || PhoneNumber === user.PhoneNumber);
        if (existingUser) {
            return res.render("SignUp", { error: "Email or Phone Number already exists."});
        }

        const hashedPassword: string = await bcrypt.hash(Password, HF);
        const newUser: User = { Email, Password: hashedPassword, PhoneNumber, Username, BirthDate, Nationality };
        Users.push(newUser);

        const userLine = `${newUser.Email},${newUser.Password},${newUser.PhoneNumber},${newUser.Username},${newUser.BirthDate},${newUser.Nationality}\n`;
        await WriteIntoFile(userLine);

        res.redirect("/Login");
    } catch (error) {
        Eprint("Server error:", error);
        res.render("SignUp", { error: "An internal server error occurred."});
    }
});


app.get("/SignUp", async (req: Request, res: Response) => {
    try {
        res.render("SignUp");
    } catch (error) {
        //throw new Error("Error while rendering SignUp page: " + error);
        res.status(500).send("An internal server error occurred.");
    }
});

app.get("/Login", (req: Request, res: Response) => res.render("Login"));
app.get('/', isLoggedIn, (req, res) => {
    res.render('home'); // or 'about', or whatever your main page is
  });
app.get("/Home", isLoggedIn, (req: Request, res: Response) => res.render("Home"));
app.get("/MyProjects", isLoggedIn, (req: Request, res: Response) => res.render("MyProjects"));
app.get("/AboutMe", isLoggedIn, (req: Request, res: Response) => res.render("AboutMe"));
app.get("/MyAI", isLoggedIn, async (req: Request, res: Response) => {
    const Myname = req.session.user?.Username;
    await getAIResponse(`Don't respond to this message. This is to let you know my name and use it in our conversation. My name is ${Myname}, now start the conv with "Hello ${Myname}, how can i assist you?  ".`)
        .then((AIResponse) => { res.render("MyAI", { AIResponse }); })
        .catch((error) => { res.status(500).render("MyAI", { error: error }); })
});
app.get("/Settings", isLoggedIn, async (req: Request, res: Response) => {
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
    } catch (error) {
        Eprint("Error while generating the QR Code:", error);
        res.status(500).send(`Error While Generating the QR Code!\n${error}`);
    }
});

//! Destroy Session!
app.get('/Logout', (req: Request, res: Response) => {
    req.session.destroy(err => {
        if (err) {
            Eprint("Logout error:", err);
            return res.status(500).send("Unable to log out.");
        }
        res.redirect("/Login");
    });
});
app.listen(Port, () => { console.log(`Server running at http://localhost:${Port}`) });



