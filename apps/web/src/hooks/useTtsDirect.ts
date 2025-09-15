// Define the interface for the request body
interface TtsRequestBodyGpt {
    input: string;
    voice: string;
}

interface TtsRequestBodyAmazonPolly {
    text: string;
    voice_id: string;
    output_format: string;
}

const BASE_URL = "https://api-epic.ir-gateway.abbvienet.com/iliad"; 
const ILIAD_API_KEY = "RlgQp6a8hyH18wgy54hBXN1POUSPRAEd"; 
  
// Open AI GPT-4o-mini-tts endpoint
export async function getTtsAudioGpt(
input: string,
voice: string
): Promise<HTMLAudioElement> {

const body: TtsRequestBodyGpt = {
    input,
    voice,
};

try {
    const response = await fetch(BASE_URL + "/api/v1/speak/gpt-4o-mini-tts", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "x-api-key": ILIAD_API_KEY,
    },
    body: JSON.stringify(body),
    });

    if (!response.ok) {
    // Throw an error for bad HTTP status codes
    throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the audio content as a Blob
    const audioBlob = await response.blob();
    
    // Create a local URL for the Blob
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create and return an HTMLAudioElement
    const audio = new Audio(audioUrl);
    return audio;
} catch (error) {
    console.error("Error during TTS request:", error);
    throw error;
}
}

// Amazon Polly endpoint
export async function getTtsAudioAmazonPolly(
    input: string,
    voice: string
    ): Promise<HTMLAudioElement> {
    
    const body: TtsRequestBodyAmazonPolly = {
        text: input,
        voice_id: voice,
        output_format: "mp3",
    };
    
    try {
        const response = await fetch(BASE_URL + "/api/v1/speak/polly", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": ILIAD_API_KEY,
        },
        body: JSON.stringify(body),
        });
    
        if (!response.ok) {
        // Throw an error for bad HTTP status codes
        throw new Error(`HTTP error! status: ${response.status}`);
        }
    
        // Get the audio content as a Blob
        const audioBlob = await response.blob();
        
        // Create a local URL for the Blob
        const audioUrl = URL.createObjectURL(audioBlob);
    
        // Create and return an HTMLAudioElement
        const audio = new Audio(audioUrl);
        return audio;
    } catch (error) {
        console.error("Error during TTS request:", error);
        throw error;
    }
}



// Example usage:
  
// getTtsAudioAmazonPolly("Hello, this is a test of Amazon Polly TTS.", "Joanna").then(audio => {
//     audio.play().then(() => {
//         console.log('Audio playback started successfully.');
//     })
//     .catch(error => {
//         console.error('Error during audio playback:', error);
//     });
// }).catch(error => {
//     console.error('Error getting TTS audio:', error);
// });

// getTtsAudioGpt("Hello, this is a test of GPT-4o-mini-tts.", "nova").then(audio => {
//     audio.play().then(() => {
//         console.log('Audio playback started successfully.');
//     })
//     .catch(error => {
//         console.error('Error during audio playback:', error);
//     });
// }).catch(error => {
//     console.error('Error getting TTS audio:', error);
// });