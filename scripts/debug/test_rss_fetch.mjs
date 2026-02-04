
import Parser from 'rss-parser';

// Polyfill for simple fetch if needed (Node 18+ has it native)
// We will use the exact logic from the Edge Function

async function testRSS() {
    console.log('Testing RSS Fetch logic...');

    // URL combinada
    const subreddits = 'Bible+Christianity+TrueChristian';
    const rssUrl = `https://www.reddit.com/r/${subreddits}/top/.rss?t=week&limit=10`;

    console.log(`URL: ${rssUrl}`);

    try {
        // Headers simulando navegador
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1',
        };

        const resp = await fetch(rssUrl, { headers });

        console.log(`Status: ${resp.status}`);
        if (!resp.ok) {
            console.error(`Blocked? ${resp.statusText}`);
            const text = await resp.text();
            console.error(`Body preview: ${text.substring(0, 200)}`);
            return;
        }

        const xmlText = await resp.text();
        console.log(`XML Length: ${xmlText.length}`);
        // console.log(`XML Preview: ${xmlText.substring(0, 200)}`);

        const parser = new Parser();
        const feed = await parser.parseString(xmlText);

        console.log(`Items found: ${feed.items.length}`);
        if (feed.items.length > 0) {
            console.log('First Item:', feed.items[0].title);
            console.log('Link:', feed.items[0].link);
        } else {
            console.log('⚠️ Feed parsed but empty items array.');
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

testRSS();
