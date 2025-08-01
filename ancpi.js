import axios from 'axios';
import { load } from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import tough from 'tough-cookie';

// List of user agents to rotate
const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.1901.188 Safari/537.36 Edg/115.0.1901.188",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.199 Safari/537.36 OPR/100.0.4815.54",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4; rv:115.0) Gecko/20100101 Firefox/115.0"
];

function getRandomUserAgent() {
    return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Shared function to create axios instance (singleton)
let axiosInstance = null;

function createAxiosInstance() {
    if (!axiosInstance) {
        const cookieJar = new tough.CookieJar();
        axiosInstance = wrapper(axios.create({
            baseURL: 'https://cf.ro/',
            headers: {
                'User-Agent': getRandomUserAgent(),
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://cf.ro/',
                'Origin': 'https://cf.ro',
            },
            jar: cookieJar,
            withCredentials: true,
        }));
    }
    return axiosInstance;
}

// Function to reset the singleton instance (useful for testing or when token expires)
export function resetAxiosInstance() {
    axiosInstance = null;
}

// Function to get token from homepage
async function getToken(instance) {
    const homeRes = await instance.get('/');
    const $ = load(homeRes.data);
    const stoken = $('#orders-stoken').val();
    
    if (!stoken) throw new Error('Token not found.');
    return stoken;
}

// Function to fetch UATs (cities) for a county
export async function getUATs(county) {
    try {
        const instance = createAxiosInstance();
        const stoken = await getToken(instance);
        
        // Get cities list for the county
        const uatsRes = await instance.get(`/ajax/uats/${county}/${stoken}`);
        const cities = uatsRes.data.cities;

        return {
            success: true,
            cities: cities,
            token: stoken
        };

    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

// Function to search ANCPI CF data
export async function searchANCPI(county, cityName, cityValue, cfNumber, pid = '1') {
    try {
        const instance = createAxiosInstance();
        const stoken = await getToken(instance);
        
        // Use cityValue directly as LID since we already have it
        const lid = cityValue;

        // Prepare form data and post search request
        const form = new URLSearchParams({
            jud: county,
            uat: cityName,
            pid: pid,
            lid: lid,
            cf: cfNumber,
            cad: ''
        });

        const searchRes = await instance.post(`/ajax/searchCF/${stoken}`, form.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            }
        });

        resetAxiosInstance();

        return {
            success: true,
            data: searchRes.data,
            city: cityName,
            lid: lid,
            token: stoken
        };

    } catch (err) {
        return {
            success: false,
            error: err.message
        };
    }
}

// Keep the original functionality for backward compatibility
const COUNTY = 'ALBA';
const CITY_NAME = 'Alba Iulia';
const CF_NUMBER = '100002';
const PID = '1';

// Original self-executing function for testing
export async function runDefaultSearch() {
    return await searchANCPI(COUNTY, CITY_NAME, CF_NUMBER, PID);
}

// If this file is run directly, execute the default search
if (import.meta.url === `file://${process.argv[1]}`) {
    runDefaultSearch().then(result => {
        if (result.success) {
            console.log('✅ Response:');
            console.dir(result.data, { depth: null, colors: true });
        } else {
            console.error('❌ Error:', result.error);
        }
    });
}
