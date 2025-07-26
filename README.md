# OCR Proxy Server

A secure proxy server that uses OpenAI's GPT-4 Vision API to extract text from images. This server includes origin-based security, rate limiting, and proper error handling.

## Features

- 🔒 **Origin-based security** - Only allows requests from specified frontend domains
- ⚡ **Rate limiting** - 2 requests per minute per IP address
- 🛡️ **CORS protection** - Configurable CORS settings
- 📝 **OCR functionality** - Extract text from images using GPT-4 Vision
- 🚀 **Lightweight** - Minimal dependencies and fast response times

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Edit the `.env` file and update:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `FRONTEND_ORIGIN`: Your frontend domain (e.g., `https://your-app.com`)
   - `PORT`: Server port (default: 3000)

3. **Start the server:**
   ```bash
   # For production
   npm start
   
   # For development (with auto-restart)
   npm run dev
   ```

## API Usage

### POST /ocr

Extract text from an image using base64 encoding.

**Request Body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
}
```

**Response:**
```json
{
  "text": "Extracted text from the image..."
}
```

**Error Responses:**
- `400` - Invalid image format
- `403` - Invalid origin
- `429` - Rate limit exceeded
- `500` - OCR processing failed

## Frontend Integration Example

```javascript
// Convert image to base64
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Send to OCR endpoint
async function extractText(imageFile) {
  try {
    const imageBase64 = await imageToBase64(imageFile);
    
    const response = await fetch('http://localhost:3000/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64 })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('OCR failed:', error);
    throw error;
  }
}
```

## Security Features

1. **Origin Validation**: Only requests from the configured `FRONTEND_ORIGIN` are allowed
2. **Rate Limiting**: Prevents abuse with 2 requests per minute per IP
3. **Input Validation**: Validates image format before processing
4. **Error Handling**: Proper error responses without exposing sensitive information

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes | - |
| `FRONTEND_ORIGIN` | Allowed frontend domain | Yes | - |
| `PORT` | Server port | No | 3000 |

## Dependencies

- `express` - Web framework
- `openai` - OpenAI API client
- `cors` - CORS middleware
- `express-rate-limit` - Rate limiting
- `body-parser` - Request body parsing
- `dotenv` - Environment variable management

## License

MIT 