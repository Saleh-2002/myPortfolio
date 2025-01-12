import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import session from "express-session";
import methodOverride from "method-override";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import * as nodemailer from "nodemailer";
import * as fs from "fs";
import QRCode from 'qrcode';

dotenv.config();
const app = express();
const Port = process.env.PORT || 3000;
const HF: number = parseInt(process.env.HASHING || "12");
const print = console.log.bind(console);


interface User {
    Email: string;
    Password: string;
    PhoneNumber: string;
    Username: string;
    BirthDate: string;
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
        console.log("Email sent:", info.response);
    } catch (error) {
        console.error(error);
        throw error;
    }
}

async function createQRCode(Email: string, Username: string, PhoneNumber: string, BirthDate: string): Promise<string> {
    try {
        // Create prettified JSON data string with 2 spaces indentation
        const jsonData = JSON.stringify(
            {
                Email,
                Username,
                PhoneNumber,
                BirthDate,
            },
            null,
            2 // Number of spaces for indentation
        );

        // Generate QR code from the prettified JSON data
        const qrCodeDataUrl = await QRCode.toDataURL(jsonData);
        console.log('QR Code generated successfully!');
        return qrCodeDataUrl;
    } catch (error) {
        console.error('Failed to generate QR code:', error);
        throw error;
    }
}



async function WriteIntoFile(Info: string): Promise<void> {
    fs.appendFile("users.txt", Info, (err) => {
        if (err) {
            console.error("Error writing to file:", err);
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
            const [Email, Password, PhoneNumber, Username, BirthDate] = line.split(",");
            Users.push({ Email, Password, PhoneNumber, Username, BirthDate });
            return Users;
        }
    } catch (error) {
        console.error("Error reading from file:", error);
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
            //await sendEmail(Email, `Welcome ${user.Username}`, "You have successfully logged in.");
            return res.redirect("/Home");
        }
        res.render("Login", { error: "Invalid Email or password." });
    } catch (error) {
        console.error("Error during login:", error);
        res.render("Login", { error: "An internal server error occurred." });
    }
});

app.post("/SignUp", async (req: Request, res: Response) => {
    const { Email, Password, PhoneNumber, Username, BirthDate } = req.body;
    try {
        await ReadFromFile("users.txt");
        if (!Email || !Password || !PhoneNumber || !Username) {
            return res.render("SignUp", { error: "All fields are required." });
        }
        if (PhoneNumber.length !== 10 || PhoneNumber[0] !== "0" || PhoneNumber[1] !== "5") {
            return res.render("SignUp", { error: "Invalid Phone Number Format." });
        }

        const existingUser = Users.find(user => user.Email.trim().toLowerCase() === Email.trim().toLowerCase() || PhoneNumber === user.PhoneNumber);
        if (existingUser) {
            return res.render("SignUp", { error: "Email or Phone Number already exists." });
        }

        const hashedPassword: string = await bcrypt.hash(Password, HF);
        const newUser: User = { Email, Password: hashedPassword, PhoneNumber, Username, BirthDate };
        Users.push(newUser);

        const userLine = `${newUser.Email},${newUser.Password},${newUser.PhoneNumber},${newUser.Username},${newUser.BirthDate}\n`;
        await WriteIntoFile(userLine);

        res.redirect("/Login");
    } catch (error) {
        console.error("Server error:", error);
        res.render("SignUp", { error: "An internal server error occurred." });
    }
});

app.get("/Login", (req: Request, res: Response) => res.render("Login"));
app.get("/SignUp", (req: Request, res: Response) => res.render("SignUp"));
app.get("/Home", isLoggedIn, (req: Request, res: Response) => res.render("Home"));
app.get("/MyProjects", isLoggedIn, (req: Request, res: Response) => res.render("MyProjects"));
app.get("/AboutMe", isLoggedIn, (req: Request, res: Response) => res.render("AboutMe"));
app.get("/Settings", isLoggedIn, async (req: Request, res: Response) => {
    if (!req.session.user) {
        return res.redirect("/Login");
    }

    try {
        const qrCodeDataUrl = await createQRCode(
            req.session.user.Email,
            req.session.user.Username,
            req.session.user.PhoneNumber,
            req.session.user.BirthDate
        );

        res.render("Settings", {
            QR: qrCodeDataUrl,
            Email: req.session.user.Email,
            Username: req.session.user.Username,
            PhoneNumber: req.session.user.PhoneNumber,
            BirthDate: req.session.user.BirthDate,});
    } catch (error) {
        res.status(500).send(`Error While Generating the QR Code!\n${error}`);
    }
});

//! Destroy Session!
app.get('/Logout', (req: Request, res: Response) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Unable to log out.");
        }
        res.redirect("/Login");
    });
});
app.listen(Port, () => { console.log(`Server running at http://localhost:${Port}`) });