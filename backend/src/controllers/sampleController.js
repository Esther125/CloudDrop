class SampleController {
    greet(req, res) {
        console.log("----SampleController");
        res.json({ message: "hi" });
    }
}

export default SampleController;
