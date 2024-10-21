import express from "express";
import cors from "cors";
import pkg from "body-parser";
import sampleRouters from "./src/routes/sampleRoutes.js";

const app = express();
app.use(cors());

// Middleware: parse request body to json format
const { json } = pkg;
app.use(json());

// Middleware：log request message
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// use routes
app.use("/api/v1", sampleRouters);

// run server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
