import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';
import {
    OpenAI
} from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigin = process.env.FRONTEND_ORIGIN;

// CORS setup
// app.use(cors({
//   origin: allowedOrigin,
//   credentials: true // for future-proofing; has no effect without cookies
// }));

// Middleware
app.use(bodyParser.json({
    limit: '10mb'
}));

// Serve static files from public directory
app.use(express.static('public'));

// Rate limiting: 2 requests per minute per IP (only for OCR endpoints)
const ocrLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 2,
    message: 'Rate limit exceeded. Try again in a minute.',
    standardHeaders: true, // (optional) send rate limit info in headers
    legacyHeaders: false,  // (optional) disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({ error: options.message });
    }
});

// Manual Origin Check (optional but extra secure)
app.use((req, res, next) => {
  const origin = req.get('Origin');
  const ip = req.ip;
  const ips = req.ips;
  const userAgent = req.get('User-Agent');
  const host = req.get('Host');
  const referer = req.get('Referer');
  console.log({origin, ip, ips, userAgent, host, referer});
//   if (origin !== allowedOrigin) {
//     return res.status(403).json({ error: 'Forbidden: Invalid origin' });
//   }
  next();
});

// Client information API endpoint
app.get('/api/client-info', (req, res) => {
  res.json({
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    origin: req.get('Origin'),
    host: req.get('Host'),
    referer: req.get('Referer'),
    requestTime: new Date().toISOString()
  });
});

// OpenAI instance
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// OCR Endpoint with rate limiting
app.post('/ocr/idcard', ocrLimiter, async (req, res) => {
    const {
        idCardBase64
    } = req.body;

    if (!idCardBase64 || !idCardBase64.startsWith('data:image/')) {
        return res.status(400).json({
            error: 'Invalid image format'
        });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano-2025-04-14',
            messages: [{
                role: 'user',
                content: [{
                        type: 'text',
                        text: `Extract all text from this image and fill this JSON: {"series":"","number":"","CNP":"","surname":"","given_names":"","sex":"","nationality":"","city":"","county":"","address":"","issued_by":"","issue_date":"","expiry_date":""}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: idCardBase64
                        }
                    }
                ]
            }],
            max_tokens: 1000
        });

        const result = response.choices[0]?.message?.content;
        res.json({
            result: JSON.parse(result),
            inputTokens: response.usage?.prompt_tokens,
            outputTokens: response.usage?.completion_tokens,
            cost: response.usage?.prompt_tokens / 1000000 * 0.1 + response.usage?.completion_tokens / 1000000 * 0.4
        });
    } catch (err) {
        console.error('OpenAI error:', err);
        res.status(500).json({
            error: 'OCR failed'
        });
    }
});

app.post('/ocr/vehiclebook', ocrLimiter, async (req, res) => {
    const {
        vehicleBookBase64
    } = req.body;

    if (!vehicleBookBase64 || !vehicleBookBase64.startsWith('data:image/')) {
        return res.status(400).json({
            error: 'Invalid image format'
        });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano-2025-04-14',
            messages: [{
                role: 'user',
                content: [{
                        type: 'text',
                        text: `Extract text from the image and fill this JSON. Leave empty if no value found: {"A":"","J":"","D.1":"","D.2":"","D.3":"","E":"","K":"","C.2":{"C 2.1":"","C 2.2":"","C 2.3":""},"B":"","H":"","I":"","I.1":"","F.1":"","G":"","P.1":"","P.2":"","P.3":"","Q":"","R":"","S.1":"","S.2":"","Y":"","Z":"", "details": ""}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: vehicleBookBase64
                        }
                    }
                ]
            }],
            max_tokens: 1000
        });

        const result = response.choices[0]?.message?.content;
        res.json({
            result: JSON.parse(result),
            inputTokens: response.usage?.prompt_tokens,
            outputTokens: response.usage?.completion_tokens,
            cost: response.usage?.prompt_tokens / 1000000 * 0.1 + response.usage?.completion_tokens / 1000000 * 0.4
        });
    } catch (err) {
        console.error('OpenAI error:', err);
        res.status(500).json({
            error: 'OCR failed'
        });
    }
});

app.post('/ocr/cf', ocrLimiter, async (req, res) => {
    const {
        cfBase64
    } = req.body;

    if (!cfBase64 || !cfBase64.startsWith('data:image/')) {
        return res.status(400).json({
            error: 'Invalid image format'
        });
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano-2025-04-14',
            messages: [{
                role: 'user',
                content: [{
                        type: 'text',
                        text: `Extract the following text from the image: nr. carte funciara, localitate (UAT), nr. cadastral, nr. topografic. UAT right next to "nr. carte funciara" at the top. Return in JSON format. Leave empty if no value found: {"nr_carte_funciara":"","adresa": {"localitate":"", "judet": ""},"nr_cadastral":"", "nr_topografic":""}`
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: cfBase64
                        }
                    }
                ]
            }],
            max_tokens: 100
        });

        const result = response.choices[0]?.message?.content;
        res.json({
            result: JSON.parse(result),
            inputTokens: response.usage?.prompt_tokens,
            outputTokens: response.usage?.completion_tokens,
            cost: response.usage?.prompt_tokens / 1000000 * 0.1 + response.usage?.completion_tokens / 1000000 * 0.4
        });
    } catch (err) {
        console.error('OpenAI error:', err);
        res.status(500).json({
            error: 'OCR failed'
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`✅ OCR proxy server running on http://localhost:${port}`);
});