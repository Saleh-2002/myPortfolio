import express, { Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import session from "express-session";
import methodOverride from "method-override";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import * as fs from "fs";

dotenv.config();
const app = express();
const Port = process.env.PORT || 3000;

// Define User type
interface User {
    Email: string;
    Password: string;
    PhoneNumber: string;
    Username: string;
}

declare module 'express-session' {
    interface SessionData {
        user: User;
    }
}

const Users: User[] = []; // Array to store user details

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
            maxAge: 60 * 60 * 1000, // 1 hour
        },
    })
);


// Middleware to check if user is logged in
function isLoggedIn(req: Request, res: Response, next: NextFunction): void {
    if (req.session.user) { return next(); }
    res.redirect("/Login");
}

async function WriteIntoFile(Info: string) {
    fs.appendFile("users.txt", Info, (err) => {
        if (err) { console.error("Error writing to file:", err); }
        else { console.log("File written successfully!"); }
    })
}
async function ReadFromFile(FilePath: string): Promise<void> {
    try {
        const data = await fs.promises.readFile(FilePath, "utf8");
        const lines = data.split("\n");
        for (const line of lines) {
            const [Email, Password, PhoneNumber, Username] = line.split(",");
            Users.push({ Email, Password, PhoneNumber, Username });
        }
    } catch (err) {
        console.error("Error reading from file:", err);
    }
}


app.post("/Login", async (req: Request, res: Response) => {
    const { Email, password } = req.body;
    //^ const UsersCount = Users.length;
    await ReadFromFile("users.txt");
    try {
        const user = Users.find((user) => user.Email === Email && bcrypt.compareSync(password, user.Password));
        if (user) {
            req.session.user = user;
            return res.redirect("/Home");
        }
        res.render("Login", { error: "Invalid Email or password." });
    } catch (error) {
        console.error("Error during login:", error);
        res.render("Login", { error: "An internal server error occurred." });
    }
});

app.post("/SignUp", async (req: Request, res: Response) => {
    const { Email, Password, PhoneNumber, Username } = req.body;
    try {
        let userFound: boolean = false;
        await ReadFromFile("users.txt");
        if (!Email || !Password || !PhoneNumber || !Username) { return res.render("SignUp", { error: "All fields are required." }); }
        if (PhoneNumber.length !== 10 || PhoneNumber[0] !== "0" || PhoneNumber[1] !== "5") { return res.render("SignUp", { error: "Invalid Phone Number Format." }); }

        const existingUser = Users.find(user => user.Email.trim().toLowerCase() === Email.trim().toLowerCase() || PhoneNumber === user.PhoneNumber);
        if (existingUser) { return res.render("SignUp", { error: "Email or Phone Number already exists." }); }

        const hashedPassword: string = await bcrypt.hash(Password, 10);
        const newUser: User = { Email, Password: hashedPassword, PhoneNumber, Username };
        Users.push(newUser);

        const userLine = `${newUser.Email},${newUser.Password},${newUser.PhoneNumber},${newUser.Username}\n`;
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
app.listen(Port, () => { console.log(`Server running at http://localhost:${Port}`) });

app.get('/Logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).send("Unable to log out.");
        }
        res.redirect("/Login");
    });
});