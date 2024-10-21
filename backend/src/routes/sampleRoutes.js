import { Router } from "express";
import SampleController from "../controllers/sampleController.js";

const sampleRouters = Router();

const sampleController = new SampleController();

const test = (req, res, next) => {
    console.log("----SampleRouters");
    next();
};

sampleRouters.get("/sample/greet", test, sampleController.greet);

export default sampleRouters;
