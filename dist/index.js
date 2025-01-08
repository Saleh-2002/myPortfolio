import express from "express";
//import bootstrap_icons from "bootstrap-icons";
const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
const port = 3000;
app.get("/", (req, res) => {
    res.render("Home");
});
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
