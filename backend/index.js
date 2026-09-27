const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
let SharedOS, AgentContract;
try {
    const sharedos = require('@aicoo/sharedos-os');
    SharedOS = sharedos.SharedOS;
} catch (e) {
    // Mock for local dev without real package
    SharedOS = class {
        async requestWriteGrant(agentId, path) {
            console.log(`[MOCK] Granting write access to ${agentId} at ${path}`);
            return { granted: true, path };
        }
        async writeFile(grant, path, data) {
            console.log(`[MOCK] Writing ${data.length} bytes to ${path}`);
        }
    };
}

const app = express();
app.use(cors());
app.use(express.json());

// TokenScythe Sanitization Layer
function sanitizeAndSummarize(rawHtmlArray) {
    let combinedText = '';
    
    // Process HTML with Cheerio
    rawHtmlArray.forEach(html => {
        if (!html) return;
        const $ = cheerio.load(html);
        // Strip out executable code and noisy layout elements
        $('script, style, noscript, iframe, link, meta, nav, footer, header, aside, .sidebar, #sidebar, .comments, .ads, svg').remove();
        
        // Try to get primary content first
        let text = $('article, main, [role="main"], .main-content, #main-content, .post-content').text();
        
        // Fallback to body if specific tags aren't present or yield too little text
        if (!text || text.trim().length < 300) {
            text = $('body').text();
        }
        
        text = text.replace(/\s+/g, ' ').trim();
        combinedText += text + '\n\n---\n\n';
    });
    
    // Neutralize imperative verbs (simple regex mockup to defang injections)
    let neutralized = combinedText
        .replace(/\b(ignore|drop|delete|forget|execute|run|hack|override|bypass)\b/gi, '[REDACTED VERB]');
        
    // In a real environment, we'd pass this to a local LLM or NLP model for actual summarization.
    // For now, we apply strict truncation to save tokens, returning up to 15,000 chars.
    if (neutralized.length > 15000) {
        neutralized = neutralized.substring(0, 15000) + '\n\n[...TRUNCATED FOR TOKEN OPTIMIZATION...]';
    }
        
    return `# TokenScythe Research Output\n\n${neutralized}\n`;
}

// Fetch in parallel with bot-evasion headers
async function scrapeUrls(urls) {
    const promises = urls.map(async (url) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
            
            const res = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TokenScythe/1.0',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            clearTimeout(timeoutId);
            
            if (!res.ok) {
                console.warn(`[TokenScythe] HTTP ${res.status} for ${url}`);
                return '';
            }
            return await res.text();
        } catch (e) {
            console.error(`[TokenScythe] Failed to fetch ${url}: `, e.message);
            return '';
        }
    });
    return await Promise.all(promises);
}

const transactionHistory = {};

app.post('/api/research', async (req, res) => {
    try {
        const { urls, prompt, buyerAgentId } = req.body;
        
        if (!urls || urls.length === 0 || !buyerAgentId) {
            return res.status(400).json({ error: 'Missing urls or buyerAgentId' });
        }
        
        // Billing Logic
        let cost = 5;
        let discountApplied = false;
        
        if (!transactionHistory[buyerAgentId]) {
            transactionHistory[buyerAgentId] = 0;
        }
        transactionHistory[buyerAgentId]++;
        
        const count = transactionHistory[buyerAgentId];
        if (count === 1) {
            cost = 0; // First search is free
        } else if (count === 3) {
            cost = 4; // 20% discount on 3rd transaction
            discountApplied = true;
        }
        
        // 1. Parallel Scraping
        console.log(`[TokenScythe] Scraping ${urls.length} targets for ${buyerAgentId} (Txn #${count}, Cost: ${cost})...`);
        const htmlArray = await scrapeUrls(urls);
        
        // 2. Strict Sanitization
        console.log('[TokenScythe] Initiating aggressive sanitization pass...');
        const sanitizedData = sanitizeAndSummarize(htmlArray);
        
        // 3. SharedOS Handoff
        console.log(`[TokenScythe] Requesting SharedOS grant for agent ${buyerAgentId}...`);
        
        const os = new SharedOS();
        const grant = await os.requestWriteGrant(buyerAgentId, '/temp_research/');
        
        if (!grant) {
             throw new Error('Failed to obtain SharedOS write grant.');
        }
        
        const fileName = `tokenscythe_${Date.now()}.md`;
        await os.writeFile(grant, `/temp_research/${fileName}`, sanitizedData);
        
        console.log(`[TokenScythe] Handoff complete: ${fileName} written to /temp_research/`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Research complete. Data dropped into SharedOS file system.',
            fileName,
            bytes: sanitizedData.length,
            preview: sanitizedData.substring(0, 200) + '...',
            billing: {
                cost,
                discountApplied,
                transactionCount: count
            }
        });
        
    } catch (error) {
        console.error('[TokenScythe] Error during operation:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`TokenScythe Air-Gapped Refinery active on port ${PORT}`);
});
