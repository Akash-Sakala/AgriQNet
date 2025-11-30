
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 8001;

// Enable CORS for all origins to allow requests from the React frontend
app.use(cors());

// Configure multer for file handling (we just need to accept the file, we don't strictly need to save it for this mock)
const upload = multer();

app.post('/detect/', upload.single('file'), (req, res) => {
    console.log(`📸 Received image analysis request at ${new Date().toISOString()}`);

    // Simulate AI processing delay (1.5 seconds)
    setTimeout(() => {
        // Return the specific mock response requested
        // In a real scenario, this would come from a Python/TensorFlow model
        res.json({
            "pestType": "grub",
            "confidence": 0.8043251037597656
        });
    }, 1500);
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`🐛 Pest Detection Service running on http://127.0.0.1:${PORT}`);
    console.log(`🔓 CORS enabled for all origins`);
});
