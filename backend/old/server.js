const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running 🚀");
});

app.post("/order", (req, res) => {
    const order = req.body;
    console.log("New Order:", order);

    res.json({
        message: "Order received successfully ✅",
        order
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
